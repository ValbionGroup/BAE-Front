import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { LogistiqueEvents } from './events';
import { EventsStore } from '#core/store/events.store';
import { MenuItem } from '#core/models/event.model';
import { API_BASE_URL } from '#core/tokens/api-url.token';

const baseUrl = 'http://api.test/v1';

function menuLine(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    productId: 3,
    name: 'Hot-dog classique',
    isVegetarian: false,
    quantity: 100,
    price: 350,
    unitCost: 1.12,
    totalCost: 112,
    category: 'Plats',
    ...overrides,
  };
}

describe(LogistiqueEvents.name, () => {
  let component: LogistiqueEvents;
  let http: HttpTestingController;
  let store: InstanceType<typeof EventsStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    const fixture = TestBed.createComponent(LogistiqueEvents);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(EventsStore);
  });

  afterEach(() => http.verify());

  it('dérive l’état d’une soirée de sa date et de son menu', () => {
    // Trois états, aucune colonne derrière : « passée » vient de la date,
    // « en préparation » de la présence d'un menu, « à planifier » de son
    // absence. La maquette les montre comme des badges ; le schéma n'a que
    // events.status, qui ne dit pas si le menu est fait.
    expect(component['statusOf']({ status: 'completed', menu: [] } as never)).toBe('past');
    expect(component['statusOf']({ status: 'scheduled', menu: [{}] } as never)).toBe('preparing');
    expect(component['statusOf']({ status: 'scheduled', menu: [] } as never)).toBe('planning');
  });

  it('somme le coût des denrées du menu, et l’ignore quand un coût est inconnu', () => {
    const known = [{ totalCost: 100 }, { totalCost: 46.4 }] as never;
    expect(component['menuCost'](known)).toBe(146.4);

    // Une recette dont on ignore le coût rend le total de la soirée inconnu :
    // additionner ce qu'on sait donnerait un chiffre faussement rassurant.
    const partial = [{ totalCost: 100 }, { totalCost: null }] as never;
    expect(component['menuCost'](partial)).toBeNull();
  });

  it('n’offre au sélecteur que les recettes absentes du menu', () => {
    const available = component['availableRecipes'](
      [
        { id: 3, name: 'Hot-dog' },
        { id: 4, name: 'Frites' },
      ] as never,
      [{ productId: 3 }] as never,
    );
    expect(available.map((recipe: { id: number }) => recipe.id)).toEqual([4]);
  });

  describe('pas-à-pas de quantité, débouncé par ligne', () => {
    /** Peuple le store par le réseau — c'est la seule porte d'entrée qu'il
     *  expose, comme dans events.store.spec.ts. */
    async function seedLine(): Promise<MenuItem> {
      const loaded = store.load();
      http.expectOne(`${baseUrl}/events`).flush([
        {
          id: '1',
          name: 'Soirée test',
          location: 'Foyer',
          date: new Date('2026-02-14T19:00:00Z').toISOString(),
        },
      ]);
      await loaded;

      const menuLoaded = store.loadEventMenu('1');
      http.expectOne(`${baseUrl}/events/1/products`).flush([menuLine()]);
      await menuLoaded;

      return store.getEventById('1')!.menu![0];
    }

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('change le nombre affiché avant tout flush HTTP', async () => {
      const line = await seedLine();

      component['step']('1', line, 1);

      // Affichage immédiat : rien n'attend le réseau.
      expect(component['quantityOf']('1', line)).toBe(101);
      // Et rien n'est encore parti : le clic n'a fait que réarmer un minuteur.
      http.expectNone(`${baseUrl}/events/1/products/3`);
    });

    it('coalesce dix clics rapides en une seule requête, avec la valeur finale', async () => {
      const line = await seedLine();

      for (let i = 0; i < 10; i++) {
        component['step']('1', line, 1);
      }
      expect(component['quantityOf']('1', line)).toBe(110);

      vi.advanceTimersByTime(400);

      const req = http.expectOne(`${baseUrl}/events/1/products/3`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ quantity: 110 });
      req.flush(menuLine({ quantity: 110 }));
      // Laisse le `.finally()` de `step()` vider l'entrée locale avant la fin
      // du test, sans quoi la promesse en vol fuiterait dans le test suivant.
      await Promise.resolve();
      await Promise.resolve();
    });

    it('ne descend jamais sous 1 : décrémenter la dernière unité ne change rien', async () => {
      const line = await seedLine();
      // La ligne part de 100 : on la ramène à 1 avant de tester le plancher.
      for (let i = 0; i < 99; i++) component['step']('1', line, -1);
      expect(component['quantityOf']('1', line)).toBe(1);

      component['step']('1', line, -1);
      expect(component['quantityOf']('1', line)).toBe(1);
    });
  });
});

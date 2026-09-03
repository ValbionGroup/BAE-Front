import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { SponsorshipCategoriesModal } from './sponsorship-categories-modal';
import { EventsStore } from '#core/store/events.store';
import { API_BASE_URL } from '@bae/ui';

const baseUrl = 'http://api.test/v1';

describe(SponsorshipCategoriesModal.name, () => {
  let component: SponsorshipCategoriesModal;
  let http: HttpTestingController;
  let store: InstanceType<typeof EventsStore>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });

    const fixture = TestBed.createComponent(SponsorshipCategoriesModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'modal');
    fixture.componentRef.setInput('eventId', '7');
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(EventsStore);
    await fixture.whenStable();
  });

  afterEach(() => {
    for (const request of http.match(() => true)) request.flush([]);
  });

  /** Peuple le menu par le réseau, seule porte d'entrée du store. */
  async function seed(category: Record<string, unknown> = {}): Promise<void> {
    const loaded = store.load();
    http
      .expectOne(`${baseUrl}/events`)
      .flush([{ id: '7', name: 'Soirée', location: 'Foyer', date: new Date().toISOString() }]);
    await loaded;

    const menu = store.loadEventMenu('7');
    http.expectOne(`${baseUrl}/events/7/products`).flush([
      {
        productId: 1,
        name: 'Burger',
        isVegetarian: false,
        quantity: 100,
        price: 400,
        unitCost: null,
        totalCost: null,
        category: 'Plats',
      },
    ]);
    await menu;

    for (const request of http.match((r) => r.url.includes('sponsorship-categories'))) {
      request.flush([
        {
          id: 3,
          eventId: 7,
          label: 'Staff BDE',
          mode: 'external',
          maxOrders: null,
          usedOrders: 0,
          prices: [],
          ...category,
        },
      ]);
    }
    // `reload()` est asynchrone : sans ce tour de boucle, `categories()` est
    // encore vide et `save()` sortirait sans rien envoyer.
    await new Promise((resolve) => setTimeout(resolve, 0));
    component['select'](3);
  }

  it('affiche le prix public en repère et laisse le champ vide', async () => {
    await seed();
    const row = component['rows']()[0];

    expect(row.price).toBeNull();
    expect(component['priceText'](row)).toBe('');
  });

  it('distingue un champ vidé d’un zéro saisi', async () => {
    await seed();

    component['commitPrice'](1, '0');
    expect(component['rows']()[0].price).toBe(0);

    component['commitPrice'](1, '');
    expect(component['rows']()[0].price).toBeNull();
  });

  it('convertit la saisie en centimes et ignore une entrée illisible', async () => {
    await seed();

    component['commitPrice'](1, '1,50');
    expect(component['rows']()[0].price).toBe(150);

    component['commitPrice'](1, 'gratuit');
    expect(component['rows']()[0].price).toBe(150);
  });

  it('remplit la grille à la moitié du prix public', async () => {
    await seed();
    component['fillAll'](0.5);

    expect(component['rows']()[0].price).toBe(200);
  });

  it('n’envoie que les lignes modifiées', async () => {
    await seed();
    component['commitPrice'](1, '2,00');

    void component['save']();

    const request = http.expectOne(
      (r) => r.method === 'PUT' && r.url.includes('/sponsorship-categories/3/prices'),
    );
    expect(request.request.body).toEqual({ prices: [{ productId: 1, priceCents: 200 }] });
    request.flush({ id: 3, eventId: 7, label: 'Staff BDE', prices: [] });
  });

  it('crée la catégorie avec le mode choisi', async () => {
    await seed();
    component['newLabel'].set('Invités du BAE');
    component['newMode'].set('internal');

    const added = component['addCategory']();
    const request = http.expectOne(`${baseUrl}/events/7/sponsorship-categories`);
    expect(request.request.body).toEqual({
      label: 'Invités du BAE',
      mode: 'internal',
      maxOrders: null,
    });
    request.flush({ id: 4, eventId: 7, label: 'Invités du BAE', mode: 'internal', prices: [] });
    await added;

    // Le mode revient à son défaut : la catégorie suivante n'hérite pas d'un
    // choix qui ne la concerne pas.
    expect(component['newMode']()).toBe('external');
  });

  /**
   * Le défaut visé : un refus du serveur avalé en silence. Le mode se verrouille
   * dès la première vente, et l'écran ne sait pas si des commandes existent —
   * si le 409 n'est pas affiché, le sélecteur semble simplement ne rien faire.
   */
  it('affiche le refus du serveur quand le mode est verrouillé', async () => {
    await seed();

    const switched = component['switchMode']('internal');
    http.expectOne(`${baseUrl}/events/7/sponsorship-categories/3`).flush(
      {
        message:
          'Des commandes ont été passées sur cette catégorie : son mode ne peut plus changer.',
      },
      { status: 409, statusText: 'Conflict' },
    );
    await switched;

    expect(component['error']()).toBe(
      'Des commandes ont été passées sur cette catégorie : son mode ne peut plus changer.',
    );
    // La catégorie garde son mode d'origine : l'écran ne doit pas mentir.
    expect(component['selected']()!.mode).toBe('external');
  });
  it('crée la catégorie avec sa limite de commandes', async () => {
    await seed();
    component['newLabel'].set('Staff bar');
    component['newMaxOrders'].set('10');

    const added = component['addCategory']();
    const request = http.expectOne(`${baseUrl}/events/7/sponsorship-categories`);
    expect(request.request.body).toEqual({
      label: 'Staff bar',
      mode: 'external',
      maxOrders: 10,
    });
    request.flush({
      id: 4,
      eventId: 7,
      label: 'Staff bar',
      mode: 'external',
      maxOrders: 10,
      usedOrders: 0,
      prices: [],
    });
    await added;

    expect(component['newMaxOrders']()).toBe('');
  });

  it('lève le plafond quand le champ est vidé', async () => {
    await seed({ maxOrders: 10, usedOrders: 3 });

    const changed = component['commitMaxOrders']('');
    const request = http.expectOne(`${baseUrl}/events/7/sponsorship-categories/3`);
    expect(request.request.body).toEqual({ maxOrders: null });
    request.flush({
      id: 3,
      eventId: 7,
      label: 'Staff BDE',
      mode: 'external',
      maxOrders: null,
      usedOrders: 3,
      prices: [],
    });
    await changed;

    expect(component['selected']()!.maxOrders).toBeNull();
  });

  it('n’envoie rien quand la limite saisie est illisible', async () => {
    await seed({ maxOrders: 10, usedOrders: 3 });

    await component['commitMaxOrders']('dix');

    http.expectNone(`${baseUrl}/events/7/sponsorship-categories/3`);
    expect(component['selected']()!.maxOrders).toBe(10);
  });

  it('résume ce que le QR a consommé', async () => {
    await seed({ maxOrders: 10, usedOrders: 3 });

    expect(component['usageLabel'](component['selected']()!)).toBe('3 / 10 commandes utilisées');
  });

  it('ne résume rien quand la limite est levée', async () => {
    await seed();

    expect(component['usageLabel'](component['selected']()!)).toBeNull();
  });

  it('signale un QR épuisé', async () => {
    await seed({ maxOrders: 2, usedOrders: 2 });

    expect(component['exhausted'](component['selected']()!)).toBe(true);
  });
});

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
  async function seed(): Promise<void> {
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
      request.flush([{ id: 3, eventId: 7, label: 'Staff BDE', prices: [] }]);
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
});

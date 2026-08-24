import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';

import { PurchasesStore, type MySubscription } from './purchases.store';

const ACTIVE: MySubscription = {
  fastPassId: 1,
  label: 'Annuelle',
  subscribedAt: '2026-01-12',
  expiresAt: '2027-01-12',
  status: 'active',
  amount: 15,
  paymentMethod: 'lydia',
};

const EXPIRED: MySubscription = { ...ACTIVE, fastPassId: 2, status: 'expired' };

describe(PurchasesStore.name, () => {
  let store: PurchasesStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/v1' },
      ],
    });
    store = TestBed.inject(PurchasesStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  const flushSubscriptions = (rows: readonly MySubscription[]): void => {
    http.expectOne((req) => req.url.endsWith('/account/subscriptions')).flush(rows);
  };

  /**
   * L'en-tête a besoin des cotisations sur **toutes** les pages ; les
   * précommandes n'intéressent que « Mes commandes ». Les demander partout
   * ferait payer une requête inutile à chaque navigation.
   */
  it('ne demande que les cotisations, pas les précommandes', () => {
    store.loadSubscriptions();

    flushSubscriptions([ACTIVE]);
    http.expectNone((req) => req.url.endsWith('/account/pre-orders'));
    expect(store.subscriptions()).toEqual([ACTIVE]);
  });

  it('retient la cotisation en cours et ignore les échues', () => {
    store.loadSubscriptions();
    flushSubscriptions([EXPIRED, ACTIVE]);

    expect(store.activeSubscription()).toEqual(ACTIVE);
  });

  it('ne trouve aucune cotisation quand toutes sont échues', () => {
    store.loadSubscriptions();
    flushSubscriptions([EXPIRED]);

    expect(store.activeSubscription()).toBeNull();
  });

  // Le magasin est un singleton et l'en-tête vit sur toutes les pages : sans
  // garde, chaque navigation rejouerait la requête.
  it('ne redemande rien une fois les cotisations connues', () => {
    store.loadSubscriptions();
    flushSubscriptions([ACTIVE]);

    store.loadSubscriptions();

    http.expectNone((req) => req.url.endsWith('/account/subscriptions'));
  });

  it('rejoue la requête quand on redemande après un échec', () => {
    store.loadSubscriptions();
    http
      .expectOne((req) => req.url.endsWith('/account/subscriptions'))
      .flush({ code: 'E_OOPS', message: 'non' }, { status: 500, statusText: 'Server Error' });

    store.reloadSubscriptions();

    flushSubscriptions([ACTIVE]);
    expect(store.activeSubscription()).toEqual(ACTIVE);
  });

  // Un 401 ou une panne ne doit pas laisser croire à une cotisation active.
  it('ne prétend à aucune cotisation quand l’appel échoue', () => {
    store.loadSubscriptions();
    http
      .expectOne((req) => req.url.endsWith('/account/subscriptions'))
      .flush({ code: 'E_OOPS', message: 'non' }, { status: 500, statusText: 'Server Error' });

    expect(store.activeSubscription()).toBeNull();
  });
});

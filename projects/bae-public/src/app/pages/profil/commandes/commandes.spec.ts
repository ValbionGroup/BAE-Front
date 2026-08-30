import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';
import { findA11yViolations } from '@bae/ui/testing';

import { Commandes } from './commandes';
import type { MyCounterOrder, MyPreOrder, MySubscription } from '../../../core/purchases.store';

const PRE_ORDER: MyPreOrder = {
  id: 4,
  reference: 'BAE-2026-0004',
  eventId: 1,
  eventName: 'Soirée Hivernale',
  eventDate: '2026-02-14',
  status: 'ready',
  lines: [
    { productId: 1, productName: 'Hot-dog', quantity: 2, receivedQuantity: 0, unitPrice: 350 },
  ],
  totalCents: 700,
  paid: true,
  fullyCollected: false,
  pickupAt: null,
  createdAt: '2026-02-01T20:00:00Z',
};

const ORDER: MyCounterOrder = {
  id: 9,
  number: 12,
  eventId: 1,
  eventName: 'Soirée Hivernale',
  eventDate: '2026-02-14',
  status: 'completed',
  lines: [{ productName: 'Bière pression', quantity: 2, unitPrice: 300 }],
  totalCents: 600,
  savedCents: 100,
  createdAt: '2026-02-14T21:00:00Z',
};

const SUBSCRIPTION: MySubscription = {
  fastPassId: 1,
  label: 'Annuelle',
  subscribedAt: '2026-01-12',
  expiresAt: '2027-01-12',
  status: 'active',
  amount: 1500,
  paymentMethod: 'lydia',
};

describe(Commandes.name, () => {
  let fixture: ComponentFixture<Commandes>;
  let host: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Commandes],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/v1' },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  const mount = async (options: {
    preOrders?: readonly MyPreOrder[];
    orders?: readonly MyCounterOrder[];
    subscriptions?: readonly MySubscription[];
    ordersFail?: boolean;
  }): Promise<void> => {
    fixture = TestBed.createComponent(Commandes);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/account/pre-orders')).flush(options.preOrders ?? []);
    http
      .expectOne((req) => req.url.endsWith('/account/subscriptions'))
      .flush(options.subscriptions ?? []);

    const orders = http.expectOne((req) => req.url.endsWith('/account/orders'));
    if (options.ordersFail === true) {
      orders.flush({ code: 'E_OOPS', message: 'non' }, { status: 500, statusText: 'nope' });
    } else {
      orders.flush(options.orders ?? []);
    }

    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('sépare précommandes, achats au comptoir et cotisations', async () => {
    await mount({ preOrders: [PRE_ORDER], orders: [ORDER], subscriptions: [SUBSCRIPTION] });

    const headings = [...host.querySelectorAll('h2')].map((h) => h.textContent?.trim());
    expect(headings).toEqual(['Précommandes', 'Achats au comptoir', 'Cotisations']);
  });

  it('affiche le numéro crié au comptoir et le montant en euros', async () => {
    await mount({ orders: [ORDER] });

    const section = host.querySelector('[data-section="orders"]')!;
    expect(section.textContent).toContain('n°12');
    expect(section.textContent).toContain('6,00');
  });

  /**
   * Sans scan du QR, une commande n'est rattachée à personne : l'absence doit
   * s'expliquer, sinon elle se lit comme un bug.
   */
  it('explique pourquoi des achats au comptoir peuvent manquer', async () => {
    await mount({ preOrders: [PRE_ORDER] });

    expect(host.querySelector('[data-section="orders"]')?.textContent).toContain(
      'présenté votre QR au comptoir',
    );
  });

  it('garde les précommandes quand les achats au comptoir échouent', async () => {
    await mount({ preOrders: [PRE_ORDER], ordersFail: true });

    expect(host.textContent).toContain('BAE-2026-0004');
  });

  it('dit qu’il n’y a rien plutôt que d’afficher trois cartes vides', async () => {
    await mount({});

    expect(host.textContent).toContain('Vous n’avez encore aucun achat');
  });

  it('ne présente aucune violation d’accessibilité', async () => {
    await mount({ preOrders: [PRE_ORDER], orders: [ORDER], subscriptions: [SUBSCRIPTION] });

    expect(await findA11yViolations(host)).toEqual([]);
  });
});

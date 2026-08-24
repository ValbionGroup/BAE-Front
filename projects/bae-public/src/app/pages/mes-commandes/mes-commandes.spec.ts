import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { MesCommandes } from './mes-commandes';
import type { MyPreOrder, MySubscription } from '../../core/purchases.store';

const PRE_ORDERS: MyPreOrder[] = [
  {
    id: 188,
    reference: 'BAE-2026-0188',
    eventId: 1,
    eventName: 'Soirée Hivernale',
    eventDate: '2026-02-14T19:30:00.000+01:00',
    status: 'ready',
    lines: [
      {
        productId: 11,
        productName: 'Hot-dog classique',
        quantity: 2,
        receivedQuantity: 0,
        unitPrice: 350,
      },
    ],
    totalCents: 700,
    paid: false,
    fullyCollected: false,
    pickupAt: null,
    createdAt: '2026-02-10T12:00:00.000+01:00',
  },
];

const SUBSCRIPTIONS: MySubscription[] = [
  {
    fastPassId: 2,
    label: '2 ans',
    subscribedAt: '2025-09-03',
    expiresAt: '2027-09-03',
    status: 'active',
    amount: 42,
    paymentMethod: 'lydia',
  },
];

describe(MesCommandes.name, () => {
  let fixture: ComponentFixture<MesCommandes>;
  let host: HTMLElement;
  let http: HttpTestingController;

  const mount = async (
    preOrders: MyPreOrder[] = PRE_ORDERS,
    subscriptions: MySubscription[] = SUBSCRIPTIONS,
  ): Promise<void> => {
    fixture = TestBed.createComponent(MesCommandes);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/account/pre-orders')).flush(preOrders);
    http.expectOne((req) => req.url.endsWith('/account/subscriptions')).flush(subscriptions);

    await fixture.whenStable();
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesCommandes],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sépare précommandes et cotisations', async () => {
    await mount();

    const headings = [...host.querySelectorAll('h2')].map((h) => h.textContent?.trim());
    expect(headings).toEqual(['Précommandes', 'Cotisations']);
  });

  /**
   * `totalCents` est en centimes, `amount` (issu de `transactions.amount`) est
   * en euros. Les deux montants sont affichés côte à côte : les confondre
   * afficherait 0,42 € pour une cotisation de 42 €.
   */
  it('respecte les deux unités monétaires de l’API', async () => {
    await mount();

    expect(host.textContent).toContain('7,00 €');
    expect(host.textContent).toContain('42,00 €');
  });

  /** Les états de cuisine ne se montrent pas tels quels à un client. */
  it('traduit le statut plutôt que d’exposer l’état de cuisine', async () => {
    await mount();

    expect(host.textContent).toContain('Prête à retirer');
    expect(host.textContent).not.toContain('ready');
  });

  /** Aucun paiement n'est branché : la précommande doit dire ce qu'il reste à faire. */
  it('signale une précommande non réglée', async () => {
    await mount();

    expect(host.textContent).toContain('À payer au retrait');
  });

  it('ne propose le détail que pour une précommande', async () => {
    await mount();

    const details = [...host.querySelectorAll('button')].filter((b) =>
      b.textContent?.includes('Détail'),
    );
    expect(details.length).toBe(1);
  });

  it('dit qu’il n’y a rien plutôt que d’afficher deux cartes vides', async () => {
    await mount([], []);

    expect(host.textContent).toContain('ni précommande ni cotisation');
    expect(host.querySelectorAll('h2').length).toBe(0);
  });

  /**
   * Une des deux listes peut échouer sans emporter l'autre — c'est la leçon du
   * `forkJoin` de la page coordination, qui se vidait entièrement dès qu'un seul
   * de ses endpoints rendait 404.
   */
  it('garde les précommandes quand les cotisations échouent', async () => {
    fixture = TestBed.createComponent(MesCommandes);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/account/pre-orders')).flush(PRE_ORDERS);
    http
      .expectOne((req) => req.url.endsWith('/account/subscriptions'))
      .flush({ code: 'E_OOPS', message: 'boom' }, { status: 500, statusText: 'Server Error' });

    await fixture.whenStable();
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).toContain('Soirée Hivernale');
  });

  /**
   * `expiresAt` arrive en `YYYY-MM-DD`. Lu par `new Date`, il part en UTC pour
   * être réaffiché en heure locale, ce qui le recule d'un jour à l'ouest de
   * Greenwich — l'adhésion paraît finir la veille.
   *
   * ⚠️ Ce test ne mord qu'à l'ouest de Greenwich : ailleurs, le décalage ne
   * traverse pas la frontière du jour.
   */
  it('affiche l’échéance au jour que le serveur a envoyé', async () => {
    await mount();

    expect(host.textContent).toContain('03/09/2027');
  });
});

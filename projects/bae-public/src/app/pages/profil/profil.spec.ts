import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';
import { findA11yViolations } from '@bae/ui/testing';

import { Profil } from './profil';
import { SessionStore, type ClientProfile, type TelegramLink } from '../../core/session.store';

const NO_TELEGRAM: TelegramLink = { handle: null, linked: false, linkedAt: null };
import type { MyCounterOrder, MyPreOrder, MySubscription } from '../../core/purchases.store';

const CLIENT: ClientProfile = {
  phone: '0612345678',
  promotion: 'I2',
  school: 'ENSEIRB',
  registeredAt: '2026-01-12',
  preparationNote: 'Allergie arachide',
};

const ACTIVE: MySubscription = {
  fastPassId: 1,
  label: 'Annuelle',
  subscribedAt: '2026-01-12',
  expiresAt: '2027-01-12',
  status: 'active',
  amount: 1500,
  paymentMethod: 'lydia',
};

const order = (id: number, createdAt: string): MyCounterOrder => ({
  id,
  number: id,
  eventId: 1,
  eventName: `Soirée ${id}`,
  eventDate: '2026-02-14',
  status: 'completed',
  lines: [{ productName: 'Hot-dog', quantity: 1, unitPrice: 250 }],
  totalCents: 250,
  savedCents: 0,
  createdAt,
});

const preOrder = (id: number, createdAt: string): MyPreOrder => ({
  id,
  reference: `BAE-2026-000${id}`,
  eventId: 1,
  eventName: `Précommande ${id}`,
  eventDate: '2026-02-14',
  status: 'pending',
  lines: [],
  totalCents: 700,
  paid: true,
  fullyCollected: false,
  pickupAt: null,
  createdAt,
});

describe(Profil.name, () => {
  let fixture: ComponentFixture<Profil>;
  let host: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Profil],
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

  interface MountOptions {
    subscriptions?: readonly MySubscription[];
    orders?: readonly MyCounterOrder[];
    preOrders?: readonly MyPreOrder[];
    client?: ClientProfile | null;
  }

  const mount = async (options: MountOptions = {}): Promise<void> => {
    TestBed.inject(SessionStore).load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({
        user: { id: 7, email: 'lea@enseirb.fr', telegram: NO_TELEGRAM },
        member: null,
        client: options.client === undefined ? CLIENT : options.client,
      });

    fixture = TestBed.createComponent(Profil);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/account/pre-orders')).flush(options.preOrders ?? []);
    http
      .expectOne((req) => req.url.endsWith('/account/subscriptions'))
      .flush(options.subscriptions ?? []);
    http.expectOne((req) => req.url.endsWith('/account/orders')).flush(options.orders ?? []);
    http
      .expectOne((req) => req.url.endsWith('/account/qr'))
      .flush({ token: 'jeton', expiresAt: '2026-08-24T19:33:00.000+02:00', ttlSeconds: 180 });

    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('affiche l’identité venue d’EirbConnect', async () => {
    await mount();

    expect(host.textContent).toContain('lea@enseirb.fr');
    expect(host.textContent).toContain('I2');
    expect(host.textContent).toContain('ENSEIRB');
  });

  it('annonce la cotisation en cours et son échéance', async () => {
    await mount({ subscriptions: [ACTIVE] });

    expect(host.textContent).toContain('Cotisation à jour');
    expect(host.textContent).toContain('Annuelle');
    expect(host.textContent).toContain('12/01/2027');
  });

  /**
   * `/account/qr` émet un jeton d'identité sans consulter les cotisations, et le
   * comptoir l'accepte tel quel : on s'identifie sans FastPass.
   */
  it('montre le QR sans cotisation, et propose le FastPass à côté', async () => {
    await mount({ subscriptions: [{ ...ACTIVE, status: 'expired' }] });

    expect(host.querySelector('bfp-identity-qr')).not.toBeNull();
    expect(host.textContent).toContain('Aucun FastPass actif');
    expect(host.querySelector('a[href="/fastpass"]')).not.toBeNull();
  });

  it('limite l’aperçu aux trois achats les plus récents, toutes sources confondues', async () => {
    await mount({
      orders: [order(1, '2026-02-01T20:00:00Z'), order(2, '2026-02-05T20:00:00Z')],
      preOrders: [preOrder(3, '2026-02-03T20:00:00Z'), preOrder(4, '2026-01-01T20:00:00Z')],
    });

    const rows = host.querySelectorAll('[data-purchase]');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('Soirée 2');
    expect(rows[1].textContent).toContain('Précommande 3');
    expect(rows[2].textContent).toContain('Soirée 1');
  });

  it('renvoie vers la page des achats', async () => {
    await mount();

    expect(host.querySelector('a[href="/profil/commandes"]')).not.toBeNull();
  });

  it('ne présente aucune violation d’accessibilité', async () => {
    await mount({ subscriptions: [ACTIVE], orders: [order(1, '2026-02-01T20:00:00Z')] });

    expect(await findA11yViolations(host)).toEqual([]);
  });
});

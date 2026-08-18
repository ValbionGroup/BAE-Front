import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { toDataURL } from 'qrcode';

import { Commande } from './commande';
import type { MyPreOrder } from '../../core/purchases.store';

const ORDER: MyPreOrder = {
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
      receivedQuantity: 2,
      unitPrice: 350,
    },
    {
      productId: 21,
      productName: 'Heineken 33cl',
      quantity: 3,
      receivedQuantity: 0,
      unitPrice: 250,
    },
  ],
  totalCents: 1450,
  paid: false,
  fullyCollected: false,
  pickupAt: null,
  createdAt: '2026-02-10T12:00:00.000+01:00',
};

describe(Commande.name, () => {
  let fixture: ComponentFixture<Commande>;
  let host: HTMLElement;
  let http: HttpTestingController;

  const QR_TOKEN = 'eyJhbGciOiJSUzI1NiJ9.jeton-signe-par-le-back.signature';

  const mount = async (order: MyPreOrder = ORDER, withQr = true): Promise<void> => {
    fixture = TestBed.createComponent(Commande);
    fixture.componentRef.setInput('id', '188');
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/account/pre-orders/188')).flush(order);
    await fixture.whenStable();
    fixture.detectChanges();

    if (withQr && order.status !== 'cancelled') {
      http
        .expectOne((req) => req.url.endsWith('/account/pre-orders/188/qr'))
        .flush({ token: QR_TOKEN, expiresAt: '2026-02-14T19:33:00.000+01:00', ttlSeconds: 180 });
      await fixture.whenStable();
      fixture.detectChanges();
    }

    host = fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Commande],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /**
   * `toDataURL` est une promesse extérieure au framework : ni `whenStable` ni
   * une temporisation fixe ne garantissent qu'elle a rendu la main. On attend
   * donc le rendu qu'on mesure, et l'attente échoue bruyamment si rien ne vient.
   */
  const waitForQr = async (): Promise<HTMLImageElement> => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      fixture.detectChanges();

      const img = host.querySelector('img');
      if (img !== null) return img;
    }
    throw new Error('le QR n’a jamais été rendu');
  };

  it('charge la précommande depuis son identifiant d’URL', async () => {
    await mount();

    expect(host.textContent).toContain('BAE-2026-0188');
    expect(host.textContent).toContain('Soirée Hivernale');
  });

  /**
   * Le QR encode le **jeton signé par le back**, pas la référence d'affichage :
   * un code fabriqué côté navigateur ne serait accepté par aucun scanner.
   */
  it('encode le jeton émis par le serveur', async () => {
    await mount();
    const img = await waitForQr();

    expect(img.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    expect(img.getAttribute('alt')).toContain('BAE-2026-0188');

    // Le rendu du même jeton doit être reproductible : on compare au QR de
    // référence, ce qui échouerait si la page encodait autre chose.
    const expected = await toDataURL(QR_TOKEN, { margin: 1, width: 220 });
    expect(img.getAttribute('src')).toBe(expected);
  });

  it('propose de réessayer quand l’émission du jeton échoue', async () => {
    await mount(ORDER, false);

    http
      .expectOne((req) => req.url.endsWith('/account/pre-orders/188/qr'))
      .flush(
        { code: 'E_OOPS', message: 'Le QR de retrait n’a pas pu être émis.' },
        { status: 500, statusText: 'Server Error' },
      );
    await fixture.whenStable();
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('[role="alert"]')?.textContent).toContain('pas pu être émis');
    expect(host.querySelector('img')).toBeNull();
  });

  /** Une commande annulée n'a pas de retrait : ne pas même demander le jeton. */
  it('ne demande aucun QR pour une précommande annulée', async () => {
    await mount({ ...ORDER, status: 'cancelled' });

    expect(host.querySelector('img')).toBeNull();
    expect(host.textContent).toContain('BAE-2026-0188');
  });

  it('ne compte que les articles restant à retirer', async () => {
    await mount();

    // 2 hot-dogs déjà pointés, 3 bières en attente.
    expect(host.textContent).toContain('3 articles à retirer');
  });

  it('barre les articles déjà remis', async () => {
    await mount();

    const collected = host.querySelector('.line-through');
    expect(collected?.textContent).toContain('Hot-dog classique');
  });

  /** Tant qu'aucun paiement n'existe, l'écran ne doit pas annoncer un règlement. */
  it('n’annonce pas un paiement qui n’a pas eu lieu', async () => {
    await mount();

    expect(host.textContent).toContain('Précommande enregistrée');
    expect(host.textContent).toContain('règlement se fait au stand');
    expect(host.textContent).not.toContain('Précommande payée');
  });

  it('dit « payée » quand une transaction est rattachée', async () => {
    await mount({ ...ORDER, paid: true });

    expect(host.textContent).toContain('Précommande payée');
  });

  it('annonce un refus plutôt qu’une page vide', async () => {
    fixture = TestBed.createComponent(Commande);
    fixture.componentRef.setInput('id', '999');
    fixture.detectChanges();

    http
      .expectOne((req) => req.url.endsWith('/account/pre-orders/999'))
      .flush(
        { code: 'E_PRE_ORDER_NOT_FOUND', message: "Cette précommande n'existe pas." },
        { status: 404, statusText: 'Not Found' },
      );

    await fixture.whenStable();
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;

    // `messageOf` préfère le message de l'API à son repli : les refus du back
    // expliquent quoi faire, un texte codé en dur ne le pourrait pas.
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("n'existe pas");
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';
import { findA11yViolations } from '@bae/ui/testing';
import { toString as qrToString } from 'qrcode';

import { MaCarte } from './ma-carte';
import { SessionStore } from '../../core/session.store';
import type { MySubscription } from '../../core/purchases.store';

const QR_TOKEN = 'eyJhbGciOiJSUzI1NiJ9.jeton-identite-signe-par-le-back.signature';

const ACTIVE: MySubscription = {
  fastPassId: 1,
  label: 'Annuelle',
  subscribedAt: '2026-01-12',
  expiresAt: '2027-01-12',
  status: 'active',
  amount: 15,
  paymentMethod: 'lydia',
};

describe(MaCarte.name, () => {
  let fixture: ComponentFixture<MaCarte>;
  let host: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaCarte],
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

  /** Monte la page avec une session connue et les cotisations demandées. */
  const mount = async (subscriptions: readonly MySubscription[], withQr = true): Promise<void> => {
    TestBed.inject(SessionStore).load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({
        user: { id: 7, email: 'lea@enseirb.fr' },
        member: { firstName: 'Léa', lastName: 'Marchand' },
      });

    fixture = TestBed.createComponent(MaCarte);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/account/subscriptions')).flush(subscriptions);
    await fixture.whenStable();
    fixture.detectChanges();

    if (withQr) {
      http
        .expectOne((req) => req.url.endsWith('/account/qr'))
        .flush({ token: QR_TOKEN, expiresAt: '2026-08-24T19:33:00.000+02:00', ttlSeconds: 180 });
      await fixture.whenStable();
      fixture.detectChanges();
    }
  };

  const waitForQr = async (): Promise<HTMLImageElement> => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      fixture.detectChanges();

      const img = host.querySelector('img');
      if (img !== null) return img;
    }
    throw new Error('le QR n’a jamais été rendu');
  };

  /**
   * Le QR encode le **jeton signé par le back**, pas l'identifiant du porteur :
   * un code fabriqué côté navigateur ne serait accepté par aucun scanner.
   */
  it('encode le jeton d’identité émis par le serveur', async () => {
    await mount([ACTIVE]);
    const img = await waitForQr();

    const svg = await qrToString(QR_TOKEN, { type: 'svg', margin: 1 });
    expect(img.getAttribute('src')).toBe(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    );
  });

  it('annonce le porteur, sa formule et son échéance', async () => {
    await mount([ACTIVE]);

    expect(host.textContent).toContain('Léa Marchand');
    expect(host.textContent).toContain('Annuelle');
    expect(host.textContent).toContain('12/01/2027');
  });

  /**
   * L'URL reste atteignable par un favori : afficher un QR que le comptoir
   * refusera serait pire que de dire pourquoi il n'y en a pas.
   */
  it('n’émet aucun QR sans cotisation en cours, et renvoie vers la formule', async () => {
    await mount([{ ...ACTIVE, status: 'expired' }], false);

    http.expectNone((req) => req.url.endsWith('/account/qr'));
    expect(host.querySelector('bae-qr-code')).toBeNull();
    expect(host.querySelector('a[href="/fastpass"]')).not.toBeNull();
  });

  /**
   * « Pas encore su » n'est pas « pas de cotisation » : conclure avant la
   * réponse ferait clignoter « aucune cotisation » chez un adhérent à jour.
   */
  it('ne conclut rien avant d’avoir la réponse du serveur', async () => {
    TestBed.inject(SessionStore).load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({ user: { id: 7, email: 'lea@enseirb.fr' }, member: null });

    fixture = TestBed.createComponent(MaCarte);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.querySelector('bae-skeleton')).not.toBeNull();
    expect(host.textContent).not.toContain('Aucune cotisation');

    http.expectOne((req) => req.url.endsWith('/account/subscriptions')).flush([]);
  });

  // Une panne n'est pas une absence d'adhésion : annoncer « aucune cotisation »
  // enverrait racheter une formule déjà payée.
  it('ne conclut à aucune cotisation quand la requête échoue', async () => {
    TestBed.inject(SessionStore).load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({ user: { id: 7, email: 'lea@enseirb.fr' }, member: null });

    fixture = TestBed.createComponent(MaCarte);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    http
      .expectOne((req) => req.url.endsWith('/account/subscriptions'))
      .flush({ code: 'E_OOPS', message: 'non' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.textContent).not.toContain('Aucune cotisation');
    expect(host.textContent).toContain('n’a pas pu être vérifiée');
  });

  it('montre le refus de l’API plutôt qu’un carré vide', async () => {
    await mount([ACTIVE], false);
    http
      .expectOne((req) => req.url.endsWith('/account/qr'))
      .flush(
        { code: 'E_OOPS', message: 'Le QR n’a pas pu être émis.' },
        { status: 500, statusText: 'Server Error' },
      );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.textContent).toContain('Le QR n’a pas pu être émis.');
  });

  it('ne présente aucune violation d’accessibilité', async () => {
    await mount([ACTIVE]);
    await waitForQr();

    expect(await findA11yViolations(fixture.nativeElement)).toEqual([]);
  });
});

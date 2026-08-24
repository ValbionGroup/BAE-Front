import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL, DropdownService, ExternalNavigation } from '@bae/ui';
import { vi } from 'vitest';

import { PublicHeader } from './public-header';
import { SessionStore } from '../../../core/session.store';
import type { MySubscription } from '../../../core/purchases.store';

const ACTIVE: MySubscription = {
  fastPassId: 1,
  label: 'Annuelle',
  subscribedAt: '2026-01-12',
  expiresAt: '2027-01-12',
  status: 'active',
  amount: 15,
  paymentMethod: 'lydia',
};

describe(PublicHeader.name, () => {
  let fixture: ComponentFixture<PublicHeader>;
  let host: HTMLElement;
  let store: SessionStore;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicHeader],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/v1' },
      ],
    }).compileComponents();

    store = TestBed.inject(SessionStore);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PublicHeader);
    await fixture.whenStable();
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => http.verify());

  const settle = async (
    member: { firstName: string | null; lastName: string | null } | null,
    email = 'lea.marchand@enseirb-matmeca.fr',
    subscriptions: readonly MySubscription[] = [],
  ): Promise<void> => {
    store.load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({
        user: { id: 7, email },
        member,
      });
    await fixture.whenStable();
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/account/subscriptions')).flush(subscriptions);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const goAnonymous = async (): Promise<void> => {
    store.load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({ code: 'E_UNAUTHORIZED', message: 'nope' }, { status: 401, statusText: '' });
    await fixture.whenStable();
    fixture.detectChanges();
  };

  /**
   * L'état qui compte le plus : `unknown` dure le temps d'un aller-retour HTTP,
   * et afficher « Connexion » pendant ce temps ferait clignoter le bouton chez
   * quelqu'un qui est en réalité connecté — le symptôme exact d'une session
   * qu'on croit perdue à chaque F5.
   */
  it('n’annonce ni connecté ni déconnecté tant que la session est inconnue', () => {
    expect(host.querySelector('bae-skeleton')).not.toBeNull();
    expect(host.textContent).not.toContain('Connexion');
  });

  it('propose la connexion à un visiteur anonyme', async () => {
    await goAnonymous();

    expect(host.textContent).toContain('Connexion');
    expect(host.querySelector('bae-skeleton')).toBeNull();
    expect(host.querySelector('bae-avatar')).toBeNull();
  });

  it('cache « Mes commandes » à un visiteur anonyme', async () => {
    await goAnonymous();

    expect(host.textContent).not.toContain('Mes commandes');
  });

  it('cache « Mes commandes » tant que la session est inconnue', () => {
    expect(host.textContent).not.toContain('Mes commandes');
  });

  it('affiche « Mes commandes » une fois connecté', async () => {
    await settle({ firstName: 'Léa', lastName: 'Marchand' });

    expect(host.textContent).toContain('Mes commandes');
  });

  it('affiche le nom quand le compte est aussi membre', async () => {
    await settle({ firstName: 'Léa', lastName: 'Marchand' });

    expect(host.querySelector('bae-avatar')).not.toBeNull();
    expect(host.textContent).toContain('Léa Marchand');
    expect(host.textContent).not.toContain('Connexion');
  });

  /**
   * Un client n'a pas de ligne `members`, donc pas de nom. L'e-mail entier
   * déborderait de l'en-tête : c'est la partie locale qui l'identifie.
   */
  it('retombe sur la partie locale de l’e-mail pour un client sans nom', async () => {
    await settle(null, 'client@enseirb-matmeca.fr');

    expect(host.textContent).toContain('client');
    expect(host.textContent).not.toContain('@enseirb-matmeca.fr');
  });

  it('ouvre un menu de compte portant la déconnexion', async () => {
    await settle({ firstName: 'Léa', lastName: 'Marchand' });

    host.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')?.click();
    await fixture.whenStable();

    const menu = TestBed.inject(DropdownService).current();
    const labels = menu?.items.map((item) => (item.type === 'action' ? item.label : '—')) ?? [];

    expect(labels).toContain('Mes commandes');
    expect(labels).toContain('Déconnexion');
  });

  /**
   * ⚠️ La déconnexion **quitte l'application** : elle passe par l'IdP pour y
   * fermer la session, sinon recliquer « EirbConnect » reconnecte sans mot de
   * passe. Rien n'est donc remis à zéro localement — il n'y a plus de page à
   * rafraîchir.
   */
  it('quitte l’application vers la déconnexion globale', async () => {
    const navigation = TestBed.inject(ExternalNavigation);
    vi.spyOn(navigation, 'go').mockImplementation(() => undefined);
    await settle({ firstName: 'Léa', lastName: 'Marchand' });

    host.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')?.click();
    await fixture.whenStable();

    const menu = TestBed.inject(DropdownService).current();
    const logout = menu?.items.find(
      (item) => item.type === 'action' && item.label === 'Déconnexion',
    );
    if (logout?.type !== 'action') throw new Error('entrée de déconnexion absente');

    logout.onClick();

    expect(navigation.go).toHaveBeenCalledWith(
      'http://api.test/v1/auth/keycloak/logout?app=public',
    );
  });

  const accountMenuLabels = async (): Promise<string[]> => {
    host.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')?.click();
    await fixture.whenStable();

    const menu = TestBed.inject(DropdownService).current();
    return menu?.items.map((item) => (item.type === 'action' ? item.label : '—')) ?? [];
  };

  /**
   * L'entrée dit « vous en avez un » : l'afficher à qui n'a pas cotisé
   * promettrait un QR que le comptoir refuserait.
   */
  it('n’offre pas le FastPass sans cotisation en cours', async () => {
    await settle({ firstName: 'Léa', lastName: 'Marchand' }, undefined, [
      { ...ACTIVE, status: 'expired' },
    ]);

    expect(await accountMenuLabels()).not.toContain('FastPass');
  });

  it('offre le FastPass quand la cotisation est en cours', async () => {
    await settle({ firstName: 'Léa', lastName: 'Marchand' }, undefined, [ACTIVE]);

    expect(await accountMenuLabels()).toContain('FastPass');
  });

  // Le menu de compte n'existe pas sur téléphone : sans cette entrée-là, le QR
  // serait inatteignable depuis l'appareil qui doit le montrer au comptoir.
  it('donne aussi accès au FastPass depuis le menu mobile', async () => {
    await settle({ firstName: 'Léa', lastName: 'Marchand' }, undefined, [ACTIVE]);

    host.querySelector<HTMLButtonElement>('button[aria-controls="menu-public"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const links = Array.from(host.querySelectorAll('#menu-public a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toContain('/ma-carte');
  });

  it('ne demande les cotisations qu’une fois pour la session', async () => {
    await settle({ firstName: 'Léa', lastName: 'Marchand' }, undefined, [ACTIVE]);

    store.load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({
        user: { id: 7, email: 'lea.marchand@enseirb-matmeca.fr' },
        member: { firstName: 'Léa', lastName: 'Marchand' },
      });
    await fixture.whenStable();

    http.expectNone((req) => req.url.endsWith('/account/subscriptions'));
  });

  it('replie la navigation derrière un bouton annonçant son état', async () => {
    await goAnonymous();

    const toggle = host.querySelector<HTMLButtonElement>('button[aria-controls="menu-public"]');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');

    toggle?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      host.querySelector('button[aria-controls="menu-public"]')?.getAttribute('aria-expanded'),
    ).toBe('true');
    expect(host.querySelector('#menu-public')).not.toBeNull();
  });
});

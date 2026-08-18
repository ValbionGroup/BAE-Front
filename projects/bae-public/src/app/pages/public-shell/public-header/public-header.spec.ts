import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DropdownService } from '@bae/ui';

import { PublicHeader } from './public-header';
import { SessionStore } from '../../../core/session.store';

describe(PublicHeader.name, () => {
  let fixture: ComponentFixture<PublicHeader>;
  let host: HTMLElement;
  let store: SessionStore;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicHeader],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
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

  it('appelle le serveur pour se déconnecter, le cookie étant httpOnly', async () => {
    await settle({ firstName: 'Léa', lastName: 'Marchand' });

    host.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')?.click();
    await fixture.whenStable();

    const menu = TestBed.inject(DropdownService).current();
    const logout = menu?.items.find(
      (item) => item.type === 'action' && item.label === 'Déconnexion',
    );
    if (logout?.type !== 'action') throw new Error('entrée de déconnexion absente');

    logout.onClick();
    http.expectOne((req) => req.url.endsWith('/auth/logout')).flush({});
    await fixture.whenStable();
    fixture.detectChanges();

    expect(store.status()).toBe('anonymous');
    expect(host.textContent).toContain('Connexion');
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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideMockStore } from '@ngrx/store/testing';

import { ParametresSecurite } from './securite';
import type { AuthState } from '#core/models/auth/auth-state.model';
import type { UserModel } from '#core/models/user.model';

function userWith(hasPassword: boolean, twoFactorEnabled = false): UserModel {
  return {
    id: 1,
    casId: 'cas-1',
    email: 'membre@bae.test',
    hasPassword,
    twoFactorEnabled,
    twoFactorConfirmedAt: twoFactorEnabled ? '2026-08-02T18:00:00.000Z' : null,
    recoveryCodesRemaining: twoFactorEnabled ? 10 : 0,
    telegram: { handle: null, linked: false, linkedAt: null },
  };
}

async function render(auth: AuthState): Promise<{
  fixture: ComponentFixture<ParametresSecurite>;
  http: HttpTestingController;
}> {
  await TestBed.configureTestingModule({
    imports: [ParametresSecurite],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      // Le rang de la session courante dispatche `[Auth] Logout` : le magasin
      // est nécessaire au composant, et il porte ici le profil sous test.
      provideMockStore({ initialState: { auth } }),
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ParametresSecurite);
  const http = TestBed.inject(HttpTestingController);
  await fixture.whenStable();
  fixture.detectChanges();

  // La page charge ses sessions à l'init ; on y répond pour ne rien laisser fuir.
  for (const req of http.match((r) => r.url.endsWith('/account/sessions'))) {
    req.flush([]);
  }

  return { fixture, http };
}

function memberAuth(hasPassword: boolean, twoFactorEnabled = false): AuthState {
  return {
    user: userWith(hasPassword, twoFactorEnabled),
    member: { id: 1, points: 0, firstName: 'A', lastName: 'B', role: 'Membre' },
    permissions: [],
  };
}

async function settle(fixture: ComponentFixture<ParametresSecurite>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

async function fill(
  fixture: ComponentFixture<ParametresSecurite>,
  testId: string,
  value: string,
): Promise<void> {
  const host = fixture.nativeElement as HTMLElement;
  const field = host.querySelector(`[data-testid="${testId}"] input`) as HTMLInputElement;
  field.value = value;
  field.dispatchEvent(new Event('input'));
  await settle(fixture);
}

/** Le code 2FA n'a qu'un `<input>` réel — voir `bae-otp-input`. */
async function fillOtp(
  fixture: ComponentFixture<ParametresSecurite>,
  value: string,
): Promise<void> {
  await fill(fixture, 'two-factor-code', value);
}

async function click(fixture: ComponentFixture<ParametresSecurite>, testId: string): Promise<void> {
  const host = fixture.nativeElement as HTMLElement;
  const button = host.querySelector(`[data-testid="${testId}"] button`) as HTMLButtonElement;
  button.click();
  await settle(fixture);
}

async function typeNewPassword(
  fixture: ComponentFixture<ParametresSecurite>,
  value: string,
): Promise<HTMLElement> {
  await fill(fixture, 'new-password', value);
  return fixture.nativeElement as HTMLElement;
}

describe(ParametresSecurite.name, () => {
  afterEach(() => {
    // `finally` : sans lui, un `verify()` qui lève empêche la réinitialisation, et
    // tous les tests suivants échouent sur « module déjà instancié » — un seul
    // vrai défaut se déguise alors en cascade.
    try {
      TestBed.inject(HttpTestingController).verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  /**
   * `users.password` est nullable depuis le SSO. Un compte provisionné par
   * Keycloak ne peut pas changer un mot de passe qu'il n'a pas — le panneau
   * n'aboutirait jamais pour lui, et lui montrer un formulaire inutilisable
   * l'envoie chercher une erreur qui n'existera pas.
   */
  it.each([
    {
      label: 'un compte avec mot de passe voit le panneau, annoncé par le sous-titre',
      hasPassword: true,
      visible: true,
      subtitle: 'Mot de passe et sessions actives.',
      twoFactorStatus: 'Inactive',
    },
    {
      label: 'un compte SSO pur ne voit ni le panneau ni sa mention',
      hasPassword: false,
      visible: false,
      subtitle: 'Sessions actives.',
      // La carte 2FA reste, mais explique pourquoi elle ne s'applique pas : la
      // faire disparaître ferait passer une exigence du cahier des charges pour
      // un oubli.
      twoFactorStatus: 'Sans objet',
    },
  ])('$label', async ({ hasPassword, visible, subtitle, twoFactorStatus, label }) => {
    const { fixture } = await render({
      user: userWith(hasPassword),
      member: { id: 1, points: 0, firstName: 'A', lastName: 'B', role: 'Membre' },
      permissions: [],
    });
    const host = fixture.nativeElement as HTMLElement;

    const panel = host.querySelector('[data-testid="password-panel"]');

    expect(panel !== null, label).toBe(visible);
    expect(host.querySelector('[data-testid="security-summary"]')?.textContent?.trim(), label).toBe(
      subtitle,
    );
    expect(
      host.querySelector('[data-testid="two-factor-status"]')?.textContent?.trim(),
      label,
    ).toBe(twoFactorStatus);
  });

  /**
   * La jauge doit mesurer ce qui est saisi. Une jauge qui annonce « Bon mot de
   * passe » sur un champ vide, ou qui ne bouge pas quand on écrit, apprend à
   * l'utilisateur à ne pas la lire — et c'est le seul retour que l'écran donne
   * sur la règle qu'il affiche juste au-dessus.
   *
   * Les quatre paliers viennent de cette règle : longueur, majuscule, chiffre,
   * puis 16 caractères pour « excellent ».
   */
  it.each([
    { label: 'champ vide', typed: '', bars: 0, strength: '', advice: '' },
    {
      label: 'ni majuscule ni chiffre ni longueur',
      typed: 'court',
      bars: 0,
      strength: 'Mot de passe faible',
      advice: 'Au moins 12 caractères, 1 majuscule et 1 chiffre.',
    },
    {
      label: 'majuscule et chiffre mais trop court',
      typed: 'Motdepasse1',
      bars: 2,
      strength: 'Mot de passe moyen',
      advice: 'Au moins 12 caractères, 1 majuscule et 1 chiffre.',
    },
    {
      label: 'la règle est satisfaite, sans la marge',
      typed: 'Motdepasse12',
      bars: 3,
      strength: 'Bon mot de passe',
      advice: 'Ajouter 4 caractères pour « excellent »',
    },
    {
      label: 'un caractère manque pour « excellent »',
      typed: 'Motdepasse12345',
      bars: 3,
      strength: 'Bon mot de passe',
      advice: 'Ajouter 1 caractère pour « excellent »',
    },
    {
      label: 'seize caractères et la règle entière',
      typed: 'Motdepasse123456',
      bars: 4,
      strength: 'Excellent mot de passe',
      advice: '',
    },
  ])('la jauge mesure la saisie : $label', async ({ typed, bars, strength, advice, label }) => {
    const { fixture } = await render({
      user: userWith(true),
      member: { id: 1, points: 0, firstName: 'A', lastName: 'B', role: 'Membre' },
      permissions: [],
    });

    const host = await typeNewPassword(fixture, typed);

    expect(
      host.querySelectorAll('[data-testid="strength-bar"][data-filled="true"]').length,
      label,
    ).toBe(bars);
    expect(
      host.querySelector('[data-testid="strength-label"]')?.textContent?.trim() ?? '',
      label,
    ).toBe(strength);
    expect(
      host.querySelector('[data-testid="strength-advice"]')?.textContent?.trim() ?? '',
      label,
    ).toBe(advice);
  });

  /**
   * Le profil n'a pas encore répondu : `user` est `undefined`. Afficher le
   * panneau par défaut le ferait apparaître puis disparaître pour un compte SSO,
   * ce qui est pire que de l'afficher tard.
   */
  it('ne montre pas le panneau tant que le profil n’a pas répondu', async () => {
    const { fixture } = await render({ permissions: [] });

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="password-panel"]'),
    ).toBeNull();
  });

  /**
   * Tout l'objet du lot côté mot de passe : les deux boutons n'avaient aucun
   * gestionnaire, et le panneau était une coquille autour d'une jauge vivante.
   */
  it('envoie le changement de mot de passe', async () => {
    const { fixture, http } = await render(memberAuth(true));

    await fill(fixture, 'current-password', 'ancien');
    await fill(fixture, 'new-password', 'Motdepasse123456');
    await fill(fixture, 'confirm-password', 'Motdepasse123456');
    await click(fixture, 'password-submit');

    const request = http.expectOne((r) => r.url.endsWith('/account/password'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      currentPassword: 'ancien',
      password: 'Motdepasse123456',
      passwordConfirmation: 'Motdepasse123456',
    });
    request.flush(null);
    // Le rechargement part dans une microtâche après la réponse : sans ce
    // `settle`, la requête n'existe pas encore au moment du `match`.
    await settle(fixture);

    // Le changement révoque les autres sessions côté serveur : la liste affichée
    // ne dit plus la vérité, donc la page la recharge.
    for (const req of http.match((r) => r.url.endsWith('/account/sessions'))) req.flush([]);
  });

  /**
   * Sans contrôle de correspondance, l'utilisateur pose un mot de passe contenant
   * sa faute de frappe et se verrouille dehors — un défaut dont il ne verrait
   * l'effet qu'à la connexion suivante.
   */
  it('n’envoie rien si la confirmation diffère', async () => {
    const { fixture, http } = await render(memberAuth(true));

    await fill(fixture, 'current-password', 'ancien');
    await fill(fixture, 'new-password', 'Motdepasse123456');
    await fill(fixture, 'confirm-password', 'Motdepasse12345');
    await click(fixture, 'password-submit');

    http.expectNone((r) => r.url.endsWith('/account/password'));

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('#confirm-password-error')).not.toBeNull();
  });

  /**
   * Les codes de secours contournent le second facteur. Les montrer avant que le
   * secret ne soit prouvé les distribuerait pour une configuration dont on ne sait
   * pas encore si elle fonctionne — et l'utilisateur se croirait protégé.
   */
  it('ne révèle les codes de secours qu’après vérification du code', async () => {
    const { fixture, http } = await render(memberAuth(true));

    await click(fixture, 'two-factor-start');
    http
      .expectOne((r) => r.url.endsWith('/account/2fa'))
      .flush({ secret: 'ABCDEFGHIJKLMNOP', otpauthUri: 'otpauth://totp/BAE:a@b.c?secret=ABC' });
    await settle(fixture);

    let host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="two-factor-qr"]'), 'QR à l’étape 1').not.toBeNull();
    expect(
      host.querySelector('[data-testid="two-factor-secret"]')?.textContent?.trim(),
      'clé lisible pour un lecteur d’écran',
    ).toBe('ABCD EFGH IJKL MNOP');
    expect(
      host.querySelector('[data-testid="two-factor-recovery-codes"]'),
      'codes cachés avant vérification',
    ).toBeNull();

    await fillOtp(fixture, '482156');
    http
      .expectOne((r) => r.url.endsWith('/account/2fa/confirm'))
      .flush({ recoveryCodes: ['AAAAA-11111', 'BBBBB-22222'] });
    await settle(fixture);
    // La confirmation réhydrate le profil pour que la carte bascule sur « Active ».
    for (const req of http.match((r) => r.url.endsWith('/account/profile'))) {
      req.flush({ user: userWith(true, true), member: null, permissions: [] });
    }
    await settle(fixture);

    host = fixture.nativeElement as HTMLElement;
    const codes = host.querySelector('[data-testid="two-factor-recovery-codes"]');
    expect(codes, 'codes visibles après vérification').not.toBeNull();
    expect(codes?.textContent).toContain('AAAAA-11111');
  });
});

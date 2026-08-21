import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideMockStore } from '@ngrx/store/testing';

import { ParametresSecurite } from './securite';
import type { AuthState } from '#core/models/auth/auth-state.model';
import type { UserModel } from '#core/models/user.model';

function userWith(hasPassword: boolean): UserModel {
  return { id: 1, casId: 'cas-1', email: 'membre@bae.test', hasPassword };
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

async function typeNewPassword(
  fixture: ComponentFixture<ParametresSecurite>,
  value: string,
): Promise<HTMLElement> {
  const host = fixture.nativeElement as HTMLElement;
  const field = host.querySelector('[data-testid="new-password"] input') as HTMLInputElement;
  field.value = value;
  field.dispatchEvent(new Event('input'));
  await fixture.whenStable();
  fixture.detectChanges();
  return host;
}

describe(ParametresSecurite.name, () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
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
    },
    {
      label: 'un compte SSO pur ne voit ni le panneau ni sa mention',
      hasPassword: false,
      visible: false,
      subtitle: 'Sessions actives.',
    },
  ])('$label', async ({ hasPassword, visible, subtitle, label }) => {
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
});

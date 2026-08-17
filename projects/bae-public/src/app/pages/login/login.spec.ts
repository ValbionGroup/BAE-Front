import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { Login } from './login';

async function mount(ssoError: string | null): Promise<ComponentFixture<Login>> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [Login],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: {
          queryParamMap: of(convertToParamMap(ssoError === null ? {} : { sso_error: ssoError })),
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(Login);
  await fixture.whenStable();
  return fixture;
}

const errorText = (fixture: ComponentFixture<Login>): string | null =>
  (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent?.trim() ??
  null;

describe(Login.name, () => {
  it("n'affiche aucune alerte quand le retour SSO est propre", async () => {
    expect(errorText(await mount(null))).toBeNull();
  });

  it('traduit un code d’échec connu', async () => {
    expect(errorText(await mount('access_denied'))).toContain('refusé l’autorisation');
  });

  it('retombe sur un message générique pour un code inconnu', async () => {
    expect(errorText(await mount('quelque_chose_de_neuf'))).toContain('a échoué');
  });

  /**
   * Le cas qui remplace une page JSON de l'API : quand l'IdP est injoignable, le
   * back renvoie ici plutôt que de laisser remonter l'exception. Le message doit
   * dire d'attendre, pas d'insister — réessayer tout de suite n'y change rien.
   */
  it('dit d’attendre quand EirbConnect est indisponible', async () => {
    const text = errorText(await mount('idp_unavailable'));

    expect(text).toContain('indisponible');
    expect(text).not.toContain('a échoué');
  });

  /**
   * `not_a_member` n'est pas censé arriver côté public — le provisionnement à la
   * volée crée la ligne `clients`. S'il arrivait quand même, l'écran doit rester
   * compréhensible plutôt que de laisser un libellé de dashboard parler de
   * rattachement à un membre.
   */
  it('ne reprend pas le libellé « membre » du dashboard', async () => {
    const text = errorText(await mount('not_a_member'));
    expect(text).not.toContain('membre');
    expect(text).toContain('a échoué');
  });

  it('propose EirbConnect comme seule porte d’entrée', async () => {
    const fixture = await mount(null);
    const host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).toContain('EirbConnect');
    // Aucun formulaire de mot de passe : la zone publique n'en a pas.
    expect(host.querySelector('form')).toBeNull();
    expect(host.querySelector('input[type="password"]')).toBeNull();
  });
});

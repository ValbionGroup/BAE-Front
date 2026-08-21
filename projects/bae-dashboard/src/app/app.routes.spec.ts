import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { routes } from './app.routes';
import type { AuthState } from '#core/models/auth/auth-state.model';

/**
 * Vérifie le **câblage**, que les tests unitaires des gardes ne peuvent pas
 * voir : un `memberGuard` impeccable mais absent d'`app.routes.ts` les laisse
 * tous verts et laisse pourtant entrer l'adhérent.
 */
describe('routes du dashboard', () => {
  const NON_MEMBRE: AuthState = {
    user: {
      id: 1,
      casId: 'x',
      email: 'adherent@enseirb.fr',
      hasPassword: false,
      twoFactorEnabled: false,
      twoFactorConfirmedAt: null,
      recoveryCodesRemaining: 0,
    },
    member: null,
    permissions: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideMockStore({ initialState: { auth: NON_MEMBRE } }),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  // Les deux points d'entrée authentifiés : la coquille applicative et la vue
  // soirée, qui vit hors d'elle. Chacun se câble séparément, donc chacun se
  // vérifie séparément.
  it.each(['/', '/soiree/live'])(
    'écarte de %s un compte authentifié sans membre rattaché',
    async (url) => {
      await RouterTestingHarness.create(url);

      expect(TestBed.inject(Router).url).toBe('/acces-refuse');
    },
  );

  /**
   * ⚠️ La réinitialisation de mot de passe **ne porte pas** `guestGuard`, et c'est
   * délibéré : quelqu'un dont une session vit encore ailleurs, et qui clique le
   * lien reçu dans sa boîte mail, doit pouvoir s'en servir. Copier-coller
   * `guestGuard` dessus renverrait vers l'accueil exactement les gens qui ont le
   * plus besoin de ce parcours — et aucun test unitaire de garde ne le verrait.
   */
  it('laisse atteindre la réinitialisation même avec une session vivante', async () => {
    await RouterTestingHarness.create('/reinitialiser-mot-de-passe?token=abc');

    expect(TestBed.inject(Router).url).toContain('/reinitialiser-mot-de-passe');
  });
});

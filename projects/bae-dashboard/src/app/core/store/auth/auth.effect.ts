import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, from, map, mergeMap, of, switchMap, tap } from 'rxjs';
import { AuthService } from '#core/services/auth/auth-service';
import { WebsocketService } from '#core/services/websocket/websocket-service';
import { API_BASE_URL, ApiError, ExternalNavigation, isApiError } from '@bae/ui';

import * as AuthActions from './auth.actions';
import { AppRoutes } from '#app/app.routes';

const UNKNOWN_LOGIN_ERROR: ApiError = { code: 'UNKNOWN_ERROR', message: '' };

const toApiError = (err: unknown): ApiError =>
  isApiError((err as HttpErrorResponse)?.error)
    ? (err as HttpErrorResponse).error
    : UNKNOWN_LOGIN_ERROR;

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly authService = inject(AuthService);
  private readonly websocketService = inject(WebsocketService);
  private readonly router = inject(Router);
  private readonly navigation = inject(ExternalNavigation);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  /**
   * ⚠️ Plus aucune garde locale préalable : le cookie de session est `httpOnly`,
   * donc **rien ici ne peut savoir** s'il existe. C'est `/account/profile` qui
   * répond — 200 ou 401 — et lui seul. Cet appel est aussi ce qui amorce le
   * cookie CSRF côté serveur.
   */
  rehydrate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.rehydrateAuth),
      mergeMap(() =>
        this.authService.getUserProfile$().pipe(
          map((userProfile) =>
            AuthActions.rehydrationSuccess({
              user: userProfile.user,
              member: userProfile.member,
              permissions: userProfile.permissions,
            }),
          ),
          catchError(() => of(AuthActions.rehydrationFailed())),
        ),
      ),
    ),
  );

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginStart),
      mergeMap(({ email, password }) =>
        this.authService.login$(email, password).pipe(
          // Le jeton n'est pas conservé : le serveur a posé le cookie dans sa
          // réponse, et le navigateur le renverra tout seul.
          switchMap(() => {
            return this.authService.getUserProfile$().pipe(
              map((userProfile) =>
                AuthActions.loginSuccess({
                  user: userProfile.user,
                  member: userProfile.member,
                  permissions: userProfile.permissions,
                }),
              ),
              catchError((err) => of(AuthActions.loginFailure({ error: toApiError(err) }))),
            );
          }),
          catchError((err) => of(AuthActions.loginFailure({ error: toApiError(err) }))),
        ),
      ),
    ),
  );

  loginSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginSuccess),
        switchMap(() => {
          const redirectTo = this.router.routerState?.snapshot?.root?.queryParams['redirectTo'];
          return from(this.router.navigateByUrl(redirectTo));
        }),
      ),
    { dispatch: false },
  );

  // Initialize WebSocket after any successful authentication
  // This handles login, rehydration, and user switching in a unified way
  initializeWebSocketOnAuthSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginSuccess, AuthActions.rehydrationSuccess),
        tap(() => {
          // Sans `user.id` : le serveur résout l'identité depuis le jeton et
          // vérifie `order:read` avant d'accorder un canal.
          this.websocketService.initialize();
        }),
      ),
    { dispatch: false },
  );

  /**
   * ⚠️ Une **navigation**, pas une requête — symétrique du bouton EirbConnect.
   *
   * Un XHR révoquerait bien la session BAE, mais ne pourrait pas fermer celle de
   * l'IdP : le navigateur doit suivre la redirection vers Keycloak. Sans ça,
   * recliquer « SSO » reconnecte instantanément et sans mot de passe, ce qui
   * surprend — et expose — sur un poste partagé.
   *
   * Le serveur révoque le jeton et efface le cookie **avant** de rediriger, donc
   * un IdP en panne ne peut pas retenir la session. Rien à nettoyer ici : le
   * `localStorage` ne porte plus que la préférence de thème, qui doit survivre.
   */
  logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logout),
        tap(() => {
          this.websocketService.shutdown();
          this.navigation.go(`${this.apiBaseUrl}/auth/keycloak/logout?app=dashboard`);
        }),
      ),
    { dispatch: false },
  );
}

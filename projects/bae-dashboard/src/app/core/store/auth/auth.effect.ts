import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, filter, from, map, mergeMap, of, switchMap, tap } from 'rxjs';
import { AuthService } from '#core/services/auth/auth-service';
import { WebsocketService } from '#core/services/websocket/websocket-service';
import { API_BASE_URL, ApiError, ExternalNavigation, isApiError } from '@bae/ui';

import * as AuthActions from './auth.actions';
import { AppRoutes } from '#app/app.routes';

const UNKNOWN_LOGIN_ERROR: ApiError = { code: 'UNKNOWN_ERROR', message: '' };

/** Le code que le back renvoie quand le mot de passe est bon mais insuffisant. */
const TWO_FACTOR_REQUIRED = 'E_TWO_FACTOR_REQUIRED';

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

  /** La destination demandée avant le rebond vers la connexion, s'il y en avait une. */
  private redirectTo(): string | undefined {
    return this.router.routerState?.snapshot?.root?.queryParams['redirectTo'];
  }

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
              // ⚠️ Surtout **pas** de branche 2FA ici : une demande de second
              // facteur ne peut pas venir d'un appel de profil. L'y ajouter
              // avalerait un échec réel derrière une redirection silencieuse.
              catchError((err) => of(AuthActions.loginFailure({ error: toApiError(err) }))),
            );
          }),
          /**
           * C'est ici, et seulement ici, que la 2FA se signale. Le back répond
           * `401 E_TWO_FACTOR_REQUIRED` plutôt qu'un `200` sans session :
           * un 200 ferait continuer le `switchMap` ci-dessus vers
           * `getUserProfile$()`, qui répondrait 401 faute de session, et la page
           * afficherait « Identifiants incorrects. » sur un mot de passe correct.
           */
          catchError((err) => {
            const error = toApiError(err);
            return of(
              error.code === TWO_FACTOR_REQUIRED
                ? AuthActions.twoFactorRequired()
                : AuthActions.loginFailure({ error }),
            );
          }),
        ),
      ),
    ),
  );

  /**
   * Le défi vit dans un cookie que le JavaScript ne peut pas lire, donc l'étape du
   * code est une **route** et non un état de ce composant : au rafraîchissement,
   * l'état du composant disparaît alors que le défi, lui, est toujours vivant.
   *
   * `redirectTo` doit traverser le saut, sinon la destination profonde est perdue.
   */
  twoFactorRequired$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.twoFactorRequired),
        switchMap(() =>
          from(
            this.router.navigate([AppRoutes.loginTwoFactor], {
              queryParams: { redirectTo: this.redirectTo() },
              queryParamsHandling: 'merge',
            }),
          ),
        ),
      ),
    { dispatch: false },
  );

  twoFactorVerify$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.twoFactorVerifyStart),
      mergeMap(({ code, kind }) =>
        this.authService.verifyTwoFactor$(code, kind).pipe(
          switchMap(() =>
            this.authService.getUserProfile$().pipe(
              map((userProfile) =>
                AuthActions.loginSuccess({
                  user: userProfile.user,
                  member: userProfile.member,
                  permissions: userProfile.permissions,
                }),
              ),
            ),
          ),
          catchError((err) => of(AuthActions.twoFactorVerifyFailure({ error: toApiError(err) }))),
        ),
      ),
    ),
  );

  sessionExpired$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.sessionExpired),
        filter(() => !this.router.url.startsWith(`/${AppRoutes.login}`)),
        exhaustMap(() => {
          const redirectTo = this.router.url;
          this.websocketService.shutdown();

          return from(this.router.navigate([AppRoutes.login], { queryParams: { redirectTo } }));
        }),
      ),
    { dispatch: false },
  );

  loginSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginSuccess),
        switchMap(() => from(this.router.navigateByUrl(this.redirectTo() ?? '/'))),
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

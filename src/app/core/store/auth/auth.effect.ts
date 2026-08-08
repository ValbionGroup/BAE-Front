import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, from, map, mergeMap, of, switchMap, tap } from 'rxjs';
import { AuthService } from '#core/services/auth/auth-service';
import { TokensService } from '#core/services/tokens/tokens-service';
import { WebsocketService } from '#core/services/websocket/websocket-service';
import { isNil } from '#shared/utils/base-function';
import { ApiError, isApiError } from '#core/models/api-response.model';

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
  private readonly tokensService = inject(TokensService);
  private readonly websocketService = inject(WebsocketService);
  private readonly router = inject(Router);

  rehydrate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.rehydrateAuth),
      mergeMap(() =>
        this.tokensService.getValidAccessToken().pipe(
          switchMap((token) => {
            if (isNil(token)) {
              return of(AuthActions.rehydrationFailed());
            }

            return this.authService.getUserProfile$().pipe(
              map((userProfile) =>
                AuthActions.rehydrationSuccess({
                  user: userProfile.user,
                  member: userProfile.member,
                  permissions: userProfile.permissions,
                }),
              ),
              catchError(() => of(AuthActions.rehydrationFailed())),
            );
          }),
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
          switchMap((token) => {
            this.tokensService.setTokens(token);
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
        tap(({ user }) => {
          if (!isNil(user.id)) {
            this.websocketService.initialize(user.id);
          }
        }),
      ),
    { dispatch: false },
  );

  logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logout),
        tap(() => {
          this.websocketService.shutdown();
          this.tokensService.clear();
          localStorage.clear();
          this.router.navigate([AppRoutes.login]);
        }),
      ),
    { dispatch: false },
  );
}

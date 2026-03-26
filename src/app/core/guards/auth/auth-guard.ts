import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  GuardResult,
  MaybeAsync,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { inject } from '@angular/core';
import { TokensService } from '#core/services/tokens/tokens-service';
import { map, take } from 'rxjs';
import { AppRoutes } from '#app/app.routes';

export const authGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
): MaybeAsync<GuardResult> => {
  const router = inject(Router);
  const tokensService = inject(TokensService);

  return tokensService.getValidAccessToken().pipe(
    take(1),
    map((token) => {
      if (token) return true;

      const redirectUrl = state.url;
      return router.createUrlTree([AppRoutes.login], {
        queryParams: { redirectTo: redirectUrl },
      });
    }),
  );
};

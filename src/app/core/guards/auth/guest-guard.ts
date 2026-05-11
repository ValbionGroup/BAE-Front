import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { TokensService } from '#core/services/tokens/tokens-service';
import { AppRoutes } from '#app/app.routes';

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const tokensService = inject(TokensService);

  return tokensService.getValidAccessToken().pipe(
    take(1),
    map((token) => {
      if (token) return router.createUrlTree([AppRoutes.home]);
      return true;
    }),
  );
};

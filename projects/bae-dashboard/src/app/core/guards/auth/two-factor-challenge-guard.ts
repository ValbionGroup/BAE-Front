import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '#core/services/auth/auth-service';
import { AppRoutes } from '#app/app-routes.const';

/**
 * Y a-t-il un défi 2FA en cours ?
 *
 * ⚠️ Ce garde ne suit **pas** le motif `isSettled` de ses voisins, et c'est
 * volontaire : les autres interrogent le magasin, qui sait tout ce qu'il y a à
 * savoir sur la session. Ici la réponse n'est pas dans le magasin et ne peut pas
 * y être — le défi est un cookie `httpOnly`. Seule l'API peut répondre.
 *
 * C'est aussi ce qui rend l'étape du code correcte au rafraîchissement, au bouton
 * retour et sur une URL collée, là où un simple drapeau en mémoire disparaîtrait.
 */
export const twoFactorChallengeGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return authService.twoFactorChallenge$().pipe(
    map(() => true as const),
    catchError(() =>
      of(
        router.createUrlTree([AppRoutes.login], {
          // La destination demandée survit au renvoi : sans ça, quelqu'un dont le
          // défi a expiré perdrait le lien profond qu'il suivait.
          queryParams: route.queryParams,
        }),
      ),
    ),
  );
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';

import { SessionStore } from './session.store';

/**
 * Attend que la session **sorte de `unknown`** avant de trancher. Conclure
 * immédiatement renverrait tout rechargement de page vers `/login`, le temps
 * que `/account/profile` réponde : le cookie est `httpOnly`, donc rien ne
 * permet de savoir localement si l'on est connecté.
 */
export const sessionGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);

  return toObservable(session.status).pipe(
    filter((status) => status !== 'unknown'),
    take(1),
    map((status) => status === 'authenticated' || router.createUrlTree(['/login'])),
  );
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';

import { SessionStore } from './session.store';

export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);

  return toObservable(session.status).pipe(
    filter((status) => status !== 'unknown'),
    take(1),
    map((status) => status === 'anonymous' || router.createUrlTree(['/'])),
  );
};

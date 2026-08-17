import type { HttpErrorResponse } from '@angular/common/http';
import { catchError, map, of, type Observable } from 'rxjs';

/**
 * `apiEnvelopeInterceptor` réduit le corps d'erreur à `{ code, message }`.
 * Le message vient de l'API parce que ses refus expliquent quoi faire — un
 * texte codé en dur ne le pourrait pas.
 */
export function messageOf(error: unknown, fallback: string): string {
  const body = (error as HttpErrorResponse | undefined)?.error as { message?: string } | undefined;
  return body?.message ?? fallback;
}

/** `0` quand l'erreur n'est pas une réponse HTTP (réseau coupé, par exemple). */
function statusOf(error: unknown): number {
  return (error as HttpErrorResponse | undefined)?.status ?? 0;
}

/**
 * Résultat d'un appel isolé. Le statut est conservé sur la branche d'échec
 * parce qu'un refus (403) et une panne (500) ne se disent pas de la même
 * façon à l'utilisateur : l'un est une règle, l'autre un incident.
 */
export type Settled<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly status: number };

/**
 * Isole un flux pour qu'un seul endpoint en panne ne puisse pas annuler tout
 * le `forkJoin` — celui-ci propage la première erreur et désabonne ses frères,
 * ce qui est exactement la façon dont la page de coordination s'était vidée
 * quand un de ses endpoints renvoyait 404.
 */
export function settle<T>(source: Observable<T>): Observable<Settled<T>> {
  return source.pipe(
    map((value): Settled<T> => ({ ok: true, value })),
    catchError((error: unknown): Observable<Settled<T>> =>
      of({ ok: false, status: statusOf(error) }),
    ),
  );
}

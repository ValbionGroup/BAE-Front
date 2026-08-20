import { HttpContext, HttpContextToken } from '@angular/common/http';

export interface PageMetadata {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
}

/**
 * La pagination d'une réponse, déposée par `apiEnvelopeInterceptor`.
 *
 * Elle passe par le `HttpContext` et non par le corps : l'intercepteur remplace
 * le corps par `data`, et l'y réintroduire obligerait les ~60 appels existants à
 * déballer un niveau de plus. Le contexte est l'objet que l'appelant possède
 * déjà — il le crée, le passe, et le relit après la réponse.
 *
 * `null` tant que la réponse n'est pas revenue, ou si l'endpoint ne pagine pas.
 */
export const PAGINATION = new HttpContextToken<PageMetadata | null>(() => null);

/**
 * Un contexte prêt à recevoir la pagination de l'appel.
 *
 * ⚠️ Un contexte par requête : le relire après une seconde requête rendrait la
 * pagination de celle-ci.
 */
export function paginationContext(): HttpContext {
  return new HttpContext().set(PAGINATION, null);
}

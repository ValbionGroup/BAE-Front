import { HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '#core/tokens/api-url.token';

/** Méthodes que Shield protège. Un GET n'a pas à porter de jeton CSRF. */
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const XSRF_COOKIE = 'XSRF-TOKEN';
const XSRF_HEADER = 'X-XSRF-TOKEN';

/**
 * ⚠️ L'intercepteur CSRF d'Angular ne convient pas ici : il n'agit que sur les
 * requêtes de **même origine**, et notre API est sur une autre. D'où celui-ci.
 *
 * Le principe reste le même : le cookie `XSRF-TOKEN` est lisible en JavaScript
 * (contrairement au jeton de session), un site tiers ne peut donc pas le lire
 * pour le recopier dans un en-tête. C'est la recopie qui prouve l'intention.
 */
export function readXsrfToken(cookieString: string): string | null {
  for (const part of cookieString.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === XSRF_COOKIE && rest.length > 0) {
      // ⚠️ Rendu **tel quel**, sans décoder : Shield attend la valeur chiffrée
      // brute et fait lui-même `decodeURIComponent(...).slice(2)` pour retirer le
      // préfixe `e:` des cookies chiffrés d'AdonisJS. Décoder ici lui ferait
      // décoder deux fois.
      //
      // Le `join('=')` est nécessaire : la valeur est du base64, qui se termine
      // souvent par `=` — couper au premier séparateur la tronquerait.
      return rest.join('=');
    }
  }
  return null;
}

export const csrfInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const apiBaseUrl = inject(API_BASE_URL);

  if (!req.url.startsWith(apiBaseUrl) || !WRITE_METHODS.has(req.method)) {
    return next(req);
  }

  const token = readXsrfToken(document.cookie);
  if (token === null) return next(req);

  return next(req.clone({ setHeaders: { [XSRF_HEADER]: token } }));
};

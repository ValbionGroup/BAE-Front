import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { API_BASE_URL } from '../../api-url.token';
import { SESSION_EXPIRED_HANDLER } from '../../session-expired.token';

/**
 * Chemins d'API dont le 401 ne dit **rien** sur la session en cours.
 *
 * - `/auth/…` : les flux anonymes. Un 401 y signifie « identifiants incorrects »
 *   ou « mauvais code », et l'appelant l'affiche lui-même dans son formulaire.
 * - `/account/profile` : c'est la réhydratation au démarrage, et son 401 est la
 *   réponse **attendue** d'un visiteur anonyme — c'est même ainsi que le front
 *   apprend qu'il n'a pas de session, faute de pouvoir lire un cookie `httpOnly`.
 *   `rehydrationFailed` traite déjà ce cas.
 */
const ANONYMOUS_PATHS = ['/auth/', '/account/profile'];

/**
 * Traduit le 401 « en cours de navigation » en un événement que l'application
 * peut traiter, au lieu de le laisser chaque magasin ranger dans son propre
 * `loadError`.
 *
 * ⚠️ Sans ce crochet, une session morte ne produisait aucune conclusion : quatre
 * panneaux affichaient « erreur de chargement » côte à côte et personne n'en
 * déduisait qu'il fallait se reconnecter. La cause n'est pas le jeton, qui ne
 * périme jamais, mais le cookie qui le porte — cf. `SESSION_TTL_SECONDS` côté
 * back, désormais renouvelé à chaque requête authentifiée. Ce chemin-ci est donc
 * le **repli** : il ne se déclenche plus qu'après une inactivité réelle.
 *
 * L'erreur continue de remonter telle quelle : c'est un observateur, pas un
 * filtre, et les appelants qui gèrent déjà leur 401 ne changent pas de
 * comportement.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const onSessionExpired = inject(SESSION_EXPIRED_HANDLER, { optional: true });

  if (onSessionExpired === null || !req.url.startsWith(apiBaseUrl)) return next(req);

  const path = req.url.slice(apiBaseUrl.length);
  if (ANONYMOUS_PATHS.some((anonymous) => path.startsWith(anonymous))) return next(req);

  return next(req).pipe(
    tap({
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) onSessionExpired();
      },
    }),
  );
};

import { HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '../../api-url.token';

/**
 * Le jeton n'est plus lu ni posé ici : il vit dans un cookie `httpOnly` que le
 * navigateur envoie tout seul, et que ce code **ne peut pas lire** — c'est
 * exactement ce qui le protège d'une XSS.
 *
 * Il ne reste donc qu'à autoriser l'envoi des cookies vers l'API, qui est sur une
 * autre origine. `IGNORE_PATHS` a disparu avec le jeton : `/auth/login` doit
 * justement recevoir le cookie **en réponse**, il n'a plus rien à éviter.
 *
 * ⚠️ Le back doit accepter cette origine dans son allowlist CORS **et** renvoyer
 * `Access-Control-Allow-Credentials` : `withCredentials` sans cela fait échouer
 * la requête au preflight, pas au 401.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const apiBaseUrl = inject(API_BASE_URL);

  if (!req.url.startsWith(apiBaseUrl)) return next(req);

  return next(req.clone({ withCredentials: true }));
};

import { HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { ApiEndPointV1 } from '#core/models/endpoint.model';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import { TokensService } from '#core/services/tokens/tokens-service';

const IGNORE_PATHS = [ApiEndPointV1.LOGIN];

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const apiBaseUrl = inject(API_BASE_URL);
  const tokenService = inject(TokensService);

  const isTargeted = req.url.startsWith(apiBaseUrl);
  if (!isTargeted) return next(req);

  if (IGNORE_PATHS.some((path) => req.url.includes(path))) {
    return next(req);
  }

  return from(tokenService.getValidAccessToken()).pipe(
    switchMap((accessToken) => {
      const authReq = accessToken
        ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
        : req;
      return next(authReq);
    }),
  );
};

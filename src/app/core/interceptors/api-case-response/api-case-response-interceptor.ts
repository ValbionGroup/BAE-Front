import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import { convertKeysToCamelCase } from '#shared/utils/case-converter';

export const apiResponseCaseInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBaseUrl = inject(API_BASE_URL);

  const snakeCaseApis: string[] = [apiBaseUrl];
  const ignoreUrls: string[] = [];
  const ignoredKeysPerUrl = new Map<string, string[]>();

  const isTargeted =
    !ignoreUrls.includes(req.url) &&
    snakeCaseApis.some((snakeCaseUrl) => req.url.startsWith(snakeCaseUrl));

  if (!isTargeted) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      return throwError(
        () =>
          new HttpErrorResponse({
            error: convertKeysToCamelCase(error.error),
            headers: error.headers,
            status: error.status,
            url: error.url as string,
          }),
      );
    }),
    map((event) => {
      if (event instanceof HttpResponse) {
        const ignoredKeys = ignoredKeysPerUrl.get(req.url) ?? [];
        return event.clone({
          body: convertKeysToCamelCase(event.body as object, ignoredKeys),
        });
      }
      return event;
    }),
  );
};

import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_BASE_URL } from '../../api-url.token';
import { ApiErrorEnvelope, ApiSuccessEnvelope, isApiError } from '../../api-response.model';
import { PAGINATION, type PageMetadata } from '../../pagination';
import { convertKeysToCamelCase } from '../../../utils/case-converter';

const isSuccessEnvelope = (body: unknown): body is ApiSuccessEnvelope =>
  typeof body === 'object' && body !== null && 'data' in body;

const isErrorEnvelope = (payload: unknown): payload is ApiErrorEnvelope =>
  typeof payload === 'object' &&
  payload !== null &&
  isApiError((payload as ApiErrorEnvelope).error);

/**
 * Unwraps the API response envelope so consumers only deal with payloads:
 * - success `{ data, meta }` → body becomes `data`
 * - failure `{ error: { code, message } }` → `HttpErrorResponse.error` becomes `{ code, message }`
 *
 * Must be registered last so it sees the raw backend response before the
 * other interceptors process it.
 */
export const apiEnvelopeInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBaseUrl = inject(API_BASE_URL);

  if (!req.url.startsWith(apiBaseUrl)) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!isErrorEnvelope(error.error)) {
        return throwError(() => error);
      }
      return throwError(
        () =>
          new HttpErrorResponse({
            error: error.error.error,
            headers: error.headers,
            status: error.status,
            statusText: error.statusText,
            url: error.url ?? undefined,
          }),
      );
    }),
    map((event) => {
      if (event instanceof HttpResponse && isSuccessEnvelope(event.body)) {
        const metadata = (event.body as { metadata?: unknown }).metadata;
        if (metadata != null) {
          req.context.set(PAGINATION, convertKeysToCamelCase(metadata) as PageMetadata);
        }
        return event.clone({ body: event.body.data });
      }
      return event;
    }),
  );
};

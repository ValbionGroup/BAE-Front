import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '../../api-url.token';
import { convertKeysToSnakeCase } from '../../../utils/case-converter';

export const apiCaseRequestInterceptor: HttpInterceptorFn = (req, next) => {
  // add other apis if needed
  const apiBaseUrl = inject(API_BASE_URL);
  const snakeCaseApis: string[] = [apiBaseUrl];
  const ignoredKeysPerUrl = new Map<string, string[]>();

  const isTargeted = snakeCaseApis.some((snakeCaseUrl) => req.url.startsWith(snakeCaseUrl));

  if (!isTargeted) {
    return next(req);
  }

  return next(
    req.clone({
      body: convertKeysToSnakeCase(req.body, ignoredKeysPerUrl.get(req.url) ?? []),
    }),
  );
};

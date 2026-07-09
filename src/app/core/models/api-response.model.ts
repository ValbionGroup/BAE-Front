export interface ApiSuccessEnvelope<T = unknown> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiErrorEnvelope {
  error: ApiError;
}

export const isApiError = (value: unknown): value is ApiError =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ApiError).code === 'string' &&
  typeof (value as ApiError).message === 'string';

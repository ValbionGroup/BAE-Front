import type { HttpErrorResponse } from '@angular/common/http';

/**
 * `apiEnvelopeInterceptor` réduit le corps d'erreur à `{ code, message }`.
 * Le message vient de l'API parce que ses refus expliquent quoi faire — un
 * texte codé en dur ne le pourrait pas.
 */
export function messageOf(error: unknown, fallback: string): string {
  const body = (error as HttpErrorResponse | undefined)?.error as { message?: string } | undefined;
  return body?.message ?? fallback;
}

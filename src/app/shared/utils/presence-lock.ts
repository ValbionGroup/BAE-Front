import { HttpErrorResponse } from '@angular/common/http';
import { isApiError } from '#core/models/api-response.model';
import type { MemberAssignment } from '#core/store/member-assignments.store';

/** Toast wording for a refused presence write. Shared by `home.ts` and
 *  `my-presences.ts` — the two screens face the same 409, worded the same way,
 *  so they must read as the same feature. */
export interface PresenceErrorView {
  readonly title: string;
  readonly message: string;
}

/**
 * Turn a failed `POST /events/:id/response` into wording the member can act on.
 *
 * `HttpErrorResponse.error` is already unwrapped to `{ code, message }` by
 * `apiEnvelopeInterceptor`. The API's own sentence is kept verbatim — including
 * for `E_PRESENCE_LOCKED_BY_ASSIGNMENT`, where it is the only text that states
 * the rule the server actually enforces.
 */
export function presenceErrorView(error: unknown): PresenceErrorView {
  const body = error instanceof HttpErrorResponse ? error.error : null;
  if (isApiError(body)) {
    return {
      title:
        body.code === 'E_PRESENCE_LOCKED_BY_ASSIGNMENT'
          ? 'Désengagement impossible'
          : 'Réponse non enregistrée',
      message: body.message,
    };
  }
  return {
    title: 'Réponse non enregistrée',
    message: "Votre réponse n'a pas pu être enregistrée. Réessayez dans un instant.",
  };
}

/**
 * Why « Absent·e » is unavailable, naming the poste(s) that lock it.
 *
 * The lock covers the whole soirée (D9) — being released from the nettoyage
 * alone does not unlock it — so the sentence names every poste held, not just
 * the first one.
 */
export function presenceLockExplanation(postes: readonly MemberAssignment[]): string {
  const named = postes.map((p) => `${p.jobName} en ${p.periodLabel.toLowerCase()}`);
  const list =
    named.length > 1 ? `${named.slice(0, -1).join(', ')} et ${named.at(-1)}` : (named[0] ?? '');
  const held = named.length > 1 ? `les postes ${list}` : `le poste ${list}`;
  return `Vous tenez ${held} : voyez le bureau pour vous désengager.`;
}

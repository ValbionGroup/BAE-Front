/**
 * Types for the "sessions actives" panel.
 *
 * `ApiSession` is the shape handed over *after* the case and envelope
 * interceptors have run: snake_case on the wire, camelCase here.
 */
export interface ApiSession {
  readonly id: number;
  /** Always `null` today — sessions are unnamed. */
  readonly name: string | null;
  readonly ipAddress: string | null;
  /** Raw `User-Agent` header; the frontend parses it into a device label. */
  readonly userAgent: string | null;
  /** ISO 8601, `null` on a freshly issued token that has not been used yet. */
  readonly lastUsedAt: string | null;
  readonly createdAt: string;
  readonly expiresAt: string | null;
  readonly isCurrent: boolean;
}

/** One session ready for display. */
export interface SessionRow {
  readonly id: number;
  /** Parsed from `userAgent`, e.g. `Mac · Chrome 121`. */
  readonly deviceLabel: string;
  /** Masked `ipAddress`, e.g. `92.184.x.x`. */
  readonly maskedIp: string;
  /** Relative time built from `lastUsedAt`, falling back to `createdAt`. */
  readonly lastSeenLabel: string;
  /** True when the label describes the first use rather than the last. */
  readonly lastSeenIsCreation: boolean;
  readonly isCurrent: boolean;
}

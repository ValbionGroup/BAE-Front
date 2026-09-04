export enum ApiEndPointV1 {
  LOGIN = '/auth/login',
  LOGOUT = '/auth/logout',
  PROFILE = '/account/profile',

  /** Flux anonymes : le défi 2FA et la réinitialisation de mot de passe. */
  TWO_FACTOR_CHALLENGE = '/auth/2fa/challenge',
  TWO_FACTOR_VERIFY = '/auth/2fa/verify',
  PASSWORD_FORGOT = '/auth/password/forgot',
  PASSWORD_RESET = '/auth/password/reset',

  /** Sécurité du compte : authentifié **et** réservé aux membres. */
  ACCOUNT_PASSWORD = '/account/password',
  ACCOUNT_PHONE = '/account/phone',
  ACCOUNT_TWO_FACTOR = '/account/2fa',
  ACCOUNT_TWO_FACTOR_CONFIRM = '/account/2fa/confirm',
  ACCOUNT_TWO_FACTOR_RECOVERY_CODES = '/account/2fa/recovery-codes',
  ACCOUNT_TWO_FACTOR_DISABLE = '/account/2fa/disable',

  /**
   * `POST` émet un ticket de liaison, `DELETE` délie. Les deux sont derrière
   * `audience('client')` côté back : la conversation est portée par `clients`.
   */
  ACCOUNT_TELEGRAM_LINK = '/account/telegram/link',

  EVENTS = '/events',
  EVENT_MEMBER_RESPONSE = '/events/:id/response',
  EVENT_ROSTER = '/events/:id/roster',
  EVENT_REMINDERS = '/events/:id/reminders',
  /** Les deux seules portes vers `events.status` — cf. `EventsStore`. */
  EVENT_OPEN = '/events/:id/open',
  EVENT_SETTLE = '/events/:id/settle',
}

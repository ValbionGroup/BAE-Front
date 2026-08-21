/** Réponse de `GET /auth/2fa/challenge` : un défi est-il en cours ? */
export interface TwoFactorChallengeModel {
  pending: boolean;
  expiresAt: string;
}

/**
 * Réponse de `POST /account/2fa`. Le secret est rendu **en clair et une seule
 * fois** : il n'est plus lisible ensuite, seule sa version chiffrée reste en base.
 *
 * `otpauthUri` est rendue telle quelle et le QR est peint côté client par
 * `bae-qr-code` — inutile de faire générer une image au serveur pour une chaîne
 * que le front sait dessiner.
 */
export interface TwoFactorEnrolmentModel {
  secret: string;
  otpauthUri: string;
}

/** Les dix codes de secours, rendus une seule fois eux aussi. */
export interface RecoveryCodesModel {
  recoveryCodes: string[];
}

/**
 * Réponse de `POST /auth/2fa/verify`. `recoveryCodesRemaining` vaut `null` quand
 * c'est un code TOTP qui a été présenté : il n'y a alors rien à décompter.
 */
export interface TwoFactorVerifyModel {
  token: string;
  recoveryCodesRemaining: number | null;
}

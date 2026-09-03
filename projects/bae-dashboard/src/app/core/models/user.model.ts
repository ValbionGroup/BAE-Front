/**
 * L'état de liaison Telegram. `linked` est **dérivé** côté back de
 * `telegramChatId`, qui ne sort jamais : c'est l'adresse d'émission du bot.
 */
export interface TelegramLinkModel {
  handle: string | null;
  linked: boolean;
  linkedAt: string | null;
}

export interface UserModel {
  id: number;
  casId: string;
  email: string;
  /**
   * `false` pour un compte provisionné par le SSO : `users.password` est
   * nullable et rien ne lui en donnera jamais. Dérivé côté back — le hash
   * lui-même ne sort pas de la base.
   */
  hasPassword: boolean;
  /**
   * Source unique de vérité pour « la 2FA est-elle active ». Le magasin de
   * l'assistant d'activation ne porte que les étapes en cours, jamais ce fait :
   * deux détenteurs pour un même booléen finiraient par le contredire.
   *
   * `false` tant que l'inscription n'est pas confirmée par un premier code
   * valide — un secret généré mais jamais vérifié ne garde rien.
   */
  twoFactorEnabled: boolean;
  twoFactorConfirmedAt: string | null;
  recoveryCodesRemaining: number;
  /**
   * Sur l'utilisateur et non sur le client : la plupart des notifications
   * s'adressent au bureau, et un membre n'a pas forcément de ligne `clients`.
   */
  telegram: TelegramLinkModel;
}

export interface MemberModel {
  id: number;
  points: number;
  firstName: string;
  lastName: string;
  role: string;
  /** Exigé par l'encaissement Lydia par QR au comptoir. */
  phone: string | null;
}

export interface UserProfileModel {
  user: UserModel;
  /**
   * `null` pour un compte sans ligne `members` — un adhérent connecté à la zone
   * publique, par exemple. Les deux zones partagent le cookie de session, donc
   * un tel profil arrive bel et bien jusqu'ici : c'est `memberGuard` qui le
   * renvoie, pas l'absence de session.
   */
  member: MemberModel | null;
  /** Permissions du rôle du membre, à plat. Vide si le membre n'a pas de rôle. */
  permissions: string[];
}

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
}

export interface MemberModel {
  id: number;
  points: number;
  firstName: string;
  lastName: string;
  role: string;
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

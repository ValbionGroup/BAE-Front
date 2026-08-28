import { InjectionToken } from '@angular/core';

/**
 * Ce que fait l'application quand l'API déclare la session morte.
 *
 * Un simple crochet, et non un service : `bae-ui` est partagée avec `bae-public`,
 * qui n'embarque **ni magasin NgRx ni garde d'authentification** — la
 * bibliothèque ne peut donc pas savoir ce que « se déconnecter » veut dire ici.
 *
 * ⚠️ À injecter en `{ optional: true }`. Une application qui ne le fournit pas —
 * la zone publique, où l'anonymat est l'état normal — doit retrouver exactement
 * le comportement d'avant : l'erreur remonte, et rien d'autre ne se produit.
 */
export const SESSION_EXPIRED_HANDLER = new InjectionToken<() => void>('SESSION_EXPIRED_HANDLER');

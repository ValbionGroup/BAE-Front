// Import **nommé** et non par défaut : importer l'objet entier inline tout le
// `package.json` dans le paquet, liste des dépendances comprise. Un front ouvert
// sur Internet n'a pas à publier cet inventaire.
import { version } from '../../../../package.json';

/** Cf. `bae-dashboard/src/app/app-version.ts` — `bae-logo` reçoit la version, il ne la lit pas. */
export const APP_VERSION = version;

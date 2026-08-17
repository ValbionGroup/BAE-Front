// Import **nommé** et non par défaut : importer l'objet entier inline tout le
// `package.json` dans le paquet, liste des dépendances comprise.
import { version } from '../../../../package.json';

/**
 * Le `bae-logo` de `@bae/ui` ne lit plus la version lui-même : la bibliothèque
 * est partagée, et remonter jusqu'au `package.json` de l'atelier la lierait à
 * l'arborescence d'une seule des deux applications.
 */
export const APP_VERSION = version;

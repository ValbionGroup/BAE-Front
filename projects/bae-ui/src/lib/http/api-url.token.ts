import { InjectionToken } from '@angular/core';
import { environment } from '../../environment/environment';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiUrl,
});

/**
 * Racine de la zone publique. Le dashboard en a besoin pour y renvoyer un
 * adhérent égaré : c'est une **autre application**, donc une navigation externe
 * et non une route — le routeur d'ici ne connaît pas ces chemins.
 */
export const PUBLIC_APP_URL = new InjectionToken<string>('PUBLIC_APP_URL', {
  providedIn: 'root',
  factory: () => environment.publicAppUrl,
});

import { Injectable } from '@angular/core';

/**
 * Une navigation de premier niveau : on **quitte** l'application Angular.
 *
 * Le `Router` ne sait pas faire ça — il ne fait que réécrire l'URL d'une SPA.
 * Or deux échanges l'exigent : partir vers l'IdP (connexion et déconnexion SSO)
 * et en revenir. Le navigateur doit suivre une vraie redirection HTTP, sinon
 * les cookies de l'IdP ne sont jamais posés ni effacés.
 *
 * Encapsulé plutôt qu'écrit en dur parce que `window.location.href = …` est
 * intestable : sous jsdom l'affectation ne navigue pas, elle avertit. Le service
 * n'a donc aucune logique — c'est une couture, et c'est tout son intérêt.
 */
@Injectable({ providedIn: 'root' })
export class ExternalNavigation {
  go(url: string): void {
    window.location.href = url;
  }
}

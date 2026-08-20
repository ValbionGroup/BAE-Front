import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { LucideArrowRight, LucideDynamicIcon, LucideLock, LucideLogOut } from '@lucide/angular';
import { Avatar, Btn, ExternalNavigation, PUBLIC_APP_URL } from '@bae/ui';
import * as AuthActions from '#core/store/auth/auth.actions';
import { selectUser } from '#core/store/auth/auth.selector';

/**
 * Le refus d'**appartenance**, pas le refus de droits : on arrive ici avec une
 * session valide mais sans ligne `members`. La page ne réclame donc aucune
 * permission et n'a rien à recharger — elle nomme le compte en cause, parce que
 * la seule question de quelqu'un d'égaré ici est « avec quel compte suis-je
 * connecté ? », et offre les deux seules sorties utiles.
 */
@Component({
  selector: 'bfd-forbidden',
  imports: [Avatar, Btn, LucideDynamicIcon],
  templateUrl: './forbidden.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Forbidden {
  private readonly store = inject(Store);
  private readonly navigation = inject(ExternalNavigation);
  private readonly publicAppUrl = inject(PUBLIC_APP_URL);

  protected readonly icLock = LucideLock;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icLogOut = LucideLogOut;

  protected readonly user = this.store.selectSignal(selectUser);

  /**
   * `Avatar` tire ses initiales des mots d'un nom, et le profil d'un non-membre
   * n'en porte aucun — l'identité vit sur `members`. La partie locale de
   * l'adresse en tient lieu : `prenom.nom@…` redonne les deux lettres du
   * gabarit, une adresse opaque retombe sur une seule.
   */
  protected readonly avatarName = computed(() =>
    (this.user()?.email ?? '')
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .trim(),
  );

  /** Une autre application : navigation externe, le routeur d'ici n'y mène pas. */
  protected goToPublicApp(): void {
    this.navigation.go(this.publicAppUrl);
  }

  protected logout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}

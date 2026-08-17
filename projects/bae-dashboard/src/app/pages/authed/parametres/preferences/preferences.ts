import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import {
  LucideArrowDown,
  LucideArrowUp,
  LucideDynamicIcon,
  LucidePlus,
  LucideX,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { PreferencesStore } from '#core/store/preferences.store';
import { ToastService } from '#shared/components/toast/toast.service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Card } from '#shared/components/ui/card/card';
import { Skeleton } from '#shared/components/ui/skeleton/skeleton';
import { ParametresSideNav } from '../side-nav/side-nav';

/**
 * "Mes préférences de postes".
 *
 * The order IS the preference: the matching engine reads this list as the
 * member's proposal order, so rank comes from position. Nothing here lets a
 * member type a rank, and nothing lets them create a poste — jobs are global
 * objects owned by administration.
 */
@Component({
  selector: 'bfd-parametres-preferences',
  imports: [Btn, Card, Skeleton, ParametresSideNav, LucideDynamicIcon],
  templateUrl: './preferences.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametresPreferences implements OnInit {
  protected readonly store = inject(PreferencesStore);
  private readonly toast = inject(ToastService);

  protected readonly icUp = LucideArrowUp;
  protected readonly icDown = LucideArrowDown;
  protected readonly icAdd = LucidePlus;
  protected readonly icRemove = LucideX;

  protected readonly skeletonRows = [0, 1, 2];

  constructor() {
    inject(PageHeaderService).set({
      title: 'Paramètres',
      subtitle: 'Compte · préférences de postes',
      breadcrumb: ['Paramètres', 'Préférences de postes'],
      activeNavId: 'set',
    });
  }

  ngOnInit(): void {
    void this.store.load();
  }

  protected async onSave(): Promise<void> {
    const ok = await this.store.save();
    if (ok) {
      this.toast.show({
        type: 'success',
        title: 'Préférences enregistrées',
        message: 'Elles seront prises en compte à la prochaine affectation.',
      });
      return;
    }
    this.toast.show({
      type: 'error',
      title: 'Enregistrement impossible',
      message: this.store.saveError() ?? 'Réessayez dans un instant.',
    });
  }

  protected moveUpLabel(name: string, rank: number): string {
    return `Remonter ${name} au rang ${rank - 1}`;
  }

  protected moveDownLabel(name: string, rank: number): string {
    return `Descendre ${name} au rang ${rank + 1}`;
  }
}

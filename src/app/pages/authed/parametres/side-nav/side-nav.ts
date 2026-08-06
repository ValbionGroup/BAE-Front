import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideBell,
  LucideDynamicIcon,
  LucideEuro,
  LucideIconInput,
  LucideSettings,
  LucideShield,
  LucideSun,
  LucideUser,
  LucideUsers,
  LucideZap,
} from '@lucide/angular';
import { AppRoutes } from '#app/app-routes.const';

interface NavItem {
  readonly id: string;
  readonly l: string;
  readonly icon: LucideIconInput;
  readonly route: string;
  readonly exact?: boolean;
  readonly adm?: boolean;
}

@Component({
  selector: 'bfd-parametres-side-nav',
  imports: [RouterLink, RouterLinkActive, LucideDynamicIcon],
  templateUrl: './side-nav.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametresSideNav {
  protected readonly items: readonly NavItem[] = [
    {
      id: 'profile',
      l: 'Profil',
      icon: LucideUser,
      route: `/${AppRoutes.parametres}`,
      exact: true,
    },
    {
      id: 'preferences',
      l: 'Préférences de postes',
      icon: LucideUsers,
      route: `/${AppRoutes.parametresPreferences}`,
    },
    {
      id: 'security',
      l: 'Sécurité & 2FA',
      icon: LucideShield,
      route: `/${AppRoutes.parametresSecurite}`,
    },
    {
      id: 'notifications',
      l: 'Notifications',
      icon: LucideBell,
      route: `/${AppRoutes.notifications}`,
    },
    {
      id: 'integrations',
      l: 'Intégrations',
      icon: LucideZap,
      route: `/${AppRoutes.parametresIntegrations}`,
    },
    {
      id: 'modules',
      l: 'Modules',
      icon: LucideSettings,
      route: `/${AppRoutes.parametresModules}`,
      adm: true,
    },
  ];

  protected showAdmHead(idx: number): boolean {
    const cur = this.items[idx];
    if (!cur.adm) return false;
    const prev = this.items[idx - 1];
    return !prev || !prev.adm;
  }
}

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
    { id: 'profile', l: 'Profil', icon: LucideUser, route: '/parametres', exact: true },
    { id: 'security', l: 'Sécurité & 2FA', icon: LucideShield, route: '/parametres/securite' },
    { id: 'notifications', l: 'Notifications', icon: LucideBell, route: '/notifications' },
    { id: 'appearance', l: 'Apparence', icon: LucideSun, route: '/parametres', exact: true },
    {
      id: 'integrations',
      l: 'Intégrations',
      icon: LucideZap,
      route: '/parametres/integrations',
    },
    { id: 'team', l: 'Équipe BAE', icon: LucideUsers, route: '/equipe' },
    {
      id: 'modules',
      l: 'Modules',
      icon: LucideSettings,
      route: '/parametres/modules',
      adm: true,
    },
    {
      id: 'billing',
      l: 'Cotisation BAE',
      icon: LucideEuro,
      route: '/parametres',
      exact: true,
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

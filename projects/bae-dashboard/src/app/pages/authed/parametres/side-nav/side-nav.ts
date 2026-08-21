import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideDynamicIcon,
  LucideIconInput,
  LucideShield,
  LucideUser,
  LucideUsers,
} from '@lucide/angular';
import { AppRoutes } from '#app/app-routes.const';

interface NavItem {
  readonly id: string;
  readonly l: string;
  readonly icon: LucideIconInput;
  readonly route: string;
  readonly exact?: boolean;
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
      l: 'Sécurité',
      icon: LucideShield,
      route: `/${AppRoutes.parametresSecurite}`,
    },
  ];
}

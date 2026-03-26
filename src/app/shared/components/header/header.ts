import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AppRoutes } from '#app/app.routes';
import {
  LucideBell,
  LucideClipboardList, LucideCog,
  LucideDynamicIcon,
  LucideHome,
  LucideHouse,
  LucideIconBase, LucideIconInput,
  LucideLayoutDashboard,
  LucideList, LucidePackage, LucideSettings, LucideShieldUser, LucideUtensils
} from '@lucide/angular';

interface NavItem {
  label: string;
  icon: LucideIconInput;
  route: string;
}

@Component({
  selector: 'bfd-header',
  imports: [RouterLink, RouterLinkActive, LucideDynamicIcon, LucideBell, LucideCog, LucideSettings],
  templateUrl: './header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  protected mobileMenuOpen = signal(false);
  protected readonly routes = AppRoutes;

  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: LucideLayoutDashboard, route: AppRoutes.home },
    { label: 'Logistique', icon: LucideUtensils, route: 'bookmarks' },
    { label: 'Coordination', icon: LucideClipboardList, route: 'team' },
    { label: 'Commandes', icon: LucidePackage, route: 'messages' },
    { label: 'Administration', icon: LucideShieldUser, route: 'calendar' },
  ];

  protected toggleMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }
}

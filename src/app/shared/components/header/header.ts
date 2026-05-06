import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
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
import {selectMember} from '#core/store/auth/auth.selector';
import {toSignal} from '@angular/core/rxjs-interop';
import {Store} from '@ngrx/store';

interface NavItem {
  label: string;
  icon: LucideIconInput;
  route: string;
}

@Component({
  selector: 'bfd-header',
  imports: [RouterLink, RouterLinkActive, LucideDynamicIcon, LucideBell, LucideSettings],
  templateUrl: './header.html',
  styles: `
    :host {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  private readonly store = inject(Store);

  protected mobileMenuOpen = signal(false);
  protected readonly routes = AppRoutes;
  protected readonly authedMember = this.store.selectSignal(selectMember);
  protected readonly memberInitials = computed(() => `${this.authedMember()?.firstName[0] ?? ''}${this.authedMember()?.lastName[0] ?? ''}`);

  protected readonly navItems: NavItem[] = [
    { label: 'Tableau de bord', icon: LucideLayoutDashboard, route: AppRoutes.home },
    { label: 'Logistique', icon: LucideUtensils, route: AppRoutes.logistics.base },
    { label: 'Coordination', icon: LucideClipboardList, route: AppRoutes.coordination.base },
    { label: 'Commandes', icon: LucidePackage, route: AppRoutes.orders.base},
    { label: 'Administration', icon: LucideShieldUser, route: AppRoutes.administration.base },
  ];

  protected toggleMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }
}

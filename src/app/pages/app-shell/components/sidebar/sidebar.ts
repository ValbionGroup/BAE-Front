import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  LucideCalendar,
  LucideChartLine,
  LucideChefHat,
  LucideContact,
  LucideDynamicIcon,
  LucideEuro,
  LucideHouse,
  LucideIconInput,
  LucideLogOut,
  LucidePackage,
  LucidePartyPopper,
  LucideQrCode,
  LucideSearch,
  LucideSettings,
  LucideShield,
  LucideShoppingCart,
  LucideTicket,
  LucideTruck,
  LucideUsers,
} from '@lucide/angular';
import { Avatar } from '#shared/components/ui/avatar/avatar';
import { Kbd } from '#shared/components/ui/kbd/kbd';
import { Logo } from '#shared/components/ui/logo/logo';
import { logout } from '#core/store/auth/auth.actions';
import { selectMember, selectPermissions } from '#core/store/auth/auth.selector';
import { AppRoutes } from '#app/app-routes.const';
import { permissionFor } from '#core/auth/route-permissions';

interface NavItem {
  readonly id: string;
  readonly route: string;
  readonly label: string;
  readonly icon: LucideIconInput;
  readonly badge?: number;
  readonly alert?: boolean;
}

interface NavGroup {
  readonly label: string;
  readonly items: readonly NavItem[];
}

const NAV: readonly NavGroup[] = [
  {
    label: 'Espace',
    items: [
      { id: 'home', route: AppRoutes.home, label: 'Accueil', icon: LucideHouse },
      { id: 'pres', route: AppRoutes.presences, label: 'Présences', icon: LucideCalendar },
      { id: 'adh', route: AppRoutes.adherents, label: 'Adhérents', icon: LucideContact },
    ],
  },
  {
    label: 'Préparation',
    items: [
      { id: 'stocks', route: AppRoutes.stocks, label: 'Stocks', icon: LucidePackage },
      { id: 'recettes', route: AppRoutes.recettes, label: 'Recettes', icon: LucideChefHat },
      { id: 'coord', route: AppRoutes.coordination, label: 'Coordination', icon: LucideUsers },
      { id: 'log', route: AppRoutes.logistique, label: 'Logistique', icon: LucideTruck },
    ],
  },
  {
    label: 'Soirée',
    items: [
      { id: 'cmd', route: AppRoutes.caisse, label: 'Caisse', icon: LucideShoppingCart },
      {
        id: 'pre',
        route: AppRoutes.precommandesAdmin,
        label: 'Précommandes',
        icon: LucideQrCode,
      },
      {
        id: 'soir',
        route: AppRoutes.soireeLive,
        label: 'Pilotage soirée',
        icon: LucidePartyPopper,
      },
      { id: 'pay', route: AppRoutes.paiements, label: 'Paiements', icon: LucideEuro },
      { id: 'ana', route: AppRoutes.analyse, label: 'Analyse', icon: LucideChartLine },
    ],
  },
];

const FOOTER: readonly NavItem[] = [
  { id: 'tick', route: AppRoutes.tickets, label: 'Tickets', icon: LucideTicket },
  { id: 'team', route: AppRoutes.equipe, label: 'Équipe BAE', icon: LucideShield },
  { id: 'set', route: AppRoutes.parametres, label: 'Paramètres', icon: LucideSettings },
];

@Component({
  selector: 'bfd-sidebar',
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideDynamicIcon,
    LucideSearch,
    LucideLogOut,
    Logo,
    Kbd,
    Avatar,
  ],
  templateUrl: './sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  readonly navigated = output<void>();

  protected onSidebarClick(event: Event): void {
    if ((event.target as HTMLElement).closest('a')) this.navigated.emit();
  }

  private readonly store = inject(Store);
  private readonly member = this.store.selectSignal(selectMember);
  private readonly permissions = this.store.selectSignal(selectPermissions);

  protected readonly userName = computed<string>(() => {
    const m = this.member();
    if (!m) return 'Aucun membre';
    return `${m.firstName} ${m.lastName}`.trim() || 'Aucun Membre';
  });

  protected readonly userRole = computed<string>(() => {
    const m = this.member();
    if (!m) return 'Aucun rôle';
    return m.role || 'Aucun rôle';
  });

  private visible(items: readonly NavItem[]): readonly NavItem[] {
    const held = this.permissions();
    return items.filter((item) => {
      const required = permissionFor(item.route);
      return required === null || held.includes(required);
    });
  }

  protected readonly groups = computed<readonly NavGroup[]>(() =>
    NAV.map((group) => ({ ...group, items: this.visible(group.items) })).filter(
      (group) => group.items.length > 0,
    ),
  );

  protected readonly footer = computed<readonly NavItem[]>(() => this.visible(FOOTER));

  protected isHome(route: string): boolean {
    return route === AppRoutes.home;
  }

  protected logout(): void {
    this.store.dispatch(logout());
  }
}

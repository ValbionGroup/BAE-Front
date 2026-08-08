import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
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

interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIconInput;
  readonly route: string;
  readonly badge?: number;
  readonly alert?: boolean;
}

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

  protected readonly espace: readonly NavItem[] = [
    { id: 'home', label: 'Accueil', icon: LucideHouse, route: '/' },
    { id: 'pres', label: 'Présences', icon: LucideCalendar, route: '/presences' },
    { id: 'adh', label: 'Adhérents', icon: LucideContact, route: '/adherents' },
  ];

  protected readonly preparation: readonly NavItem[] = [
    { id: 'stocks', label: 'Stocks', icon: LucidePackage, route: '/stocks' },
    { id: 'recettes', label: 'Recettes', icon: LucideChefHat, route: '/recettes' },
    { id: 'coord', label: 'Coordination', icon: LucideUsers, route: '/coordination' },
    { id: 'log', label: 'Logistique', icon: LucideTruck, route: '/logistique' },
  ];

  protected readonly soiree: readonly NavItem[] = [
    { id: 'cmd', label: 'Caisse', icon: LucideShoppingCart, route: '/caisse' },
    { id: 'pre', label: 'Précommandes', icon: LucideQrCode, route: '/precommandes' },
    { id: 'soir', label: 'Pilotage soirée', icon: LucidePartyPopper, route: '/soiree' },
    { id: 'pay', label: 'Paiements', icon: LucideEuro, route: '/paiements' },
    { id: 'ana', label: 'Analyse', icon: LucideChartLine, route: '/analyse' },
  ];

  protected readonly footer = computed<readonly NavItem[]>(() => [
    { id: 'tick', label: 'Tickets', icon: LucideTicket, route: '/tickets' },
    ...(this.permissions().includes('role:read')
      ? [{ id: 'team', label: 'Équipe BAE', icon: LucideShield, route: '/equipe' }]
      : []),
    { id: 'set', label: 'Paramètres', icon: LucideSettings, route: '/parametres' },
  ]);

  protected logout(): void {
    this.store.dispatch(logout());
  }
}

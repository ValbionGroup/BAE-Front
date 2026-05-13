import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  LucideCalendar,
  LucideChartLine,
  LucideChefHat,
  LucideChevronDown,
  LucideDynamicIcon,
  LucideEuro,
  LucideHouse,
  LucideIconInput,
  LucidePackage,
  LucideQrCode,
  LucideSearch,
  LucideSettings,
  LucideShoppingCart,
  LucideTicket,
  LucideTruck,
  LucideUsers,
} from '@lucide/angular';
import { Avatar } from '#shared/components/ui/avatar/avatar';
import { Kbd } from '#shared/components/ui/kbd/kbd';
import { Logo } from '#shared/components/ui/logo/logo';
import { selectMember } from '#core/store/auth/auth.selector';

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
    LucideChevronDown,
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

  protected readonly userName = computed<string>(() => {
    const m = this.member();
    if (!m) return 'Léa Marchand';
    return `${m.firstName} ${m.lastName}`.trim() || 'Léa Marchand';
  });

  protected readonly userRole = computed<string>(() => {
    const m = this.member();
    if (!m) return 'Trésorière · 2A';
    return m.role || 'Trésorière · 2A';
  });

  protected readonly espace: readonly NavItem[] = [
    { id: 'home', label: 'Accueil', icon: LucideHouse, route: '/' },
    { id: 'pres', label: 'Présences', icon: LucideCalendar, route: '/presences', badge: 2 },
  ];

  protected readonly preparation: readonly NavItem[] = [
    { id: 'stocks', label: 'Stocks', icon: LucidePackage, route: '/stocks', alert: true },
    { id: 'recettes', label: 'Recettes', icon: LucideChefHat, route: '/recettes' },
    { id: 'coord', label: 'Coordination', icon: LucideUsers, route: '/coordination' },
    { id: 'log', label: 'Logistique', icon: LucideTruck, route: '/logistique' },
  ];

  protected readonly soiree: readonly NavItem[] = [
    { id: 'cmd', label: 'Caisse', icon: LucideShoppingCart, route: '/caisse' },
    { id: 'pre', label: 'Précommandes', icon: LucideQrCode, route: '/precommandes', badge: 12 },
    { id: 'pay', label: 'Paiements', icon: LucideEuro, route: '/paiements' },
    { id: 'ana', label: 'Analyse', icon: LucideChartLine, route: '/analyse' },
  ];

  protected readonly footer: readonly NavItem[] = [
    { id: 'tick', label: 'Tickets', icon: LucideTicket, route: '/tickets' },
    { id: 'set', label: 'Paramètres', icon: LucideSettings, route: '/parametres' },
  ];
}

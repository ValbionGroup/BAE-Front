import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideDynamicIcon,
  LucideLogOut,
  LucideMenu,
  LucideMoon,
  LucideQrCode,
  LucideSun,
  LucideUser,
  LucideX,
} from '@lucide/angular';
import { Avatar, Btn, DropdownService, Logo, Skeleton, ThemeService } from '@bae/ui';

import { APP_VERSION } from '../../../app-version';
import { SessionStore } from '../../../core/session.store';

interface NavLink {
  readonly path: string;
  readonly label: string;
  readonly exact: boolean;
}

@Component({
  selector: 'bfp-public-header',
  imports: [RouterLink, RouterLinkActive, Logo, Btn, Avatar, Skeleton, LucideDynamicIcon],
  templateUrl: './public-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHeader {
  private readonly dropdown = inject(DropdownService);
  private readonly router = inject(Router);

  protected readonly session = inject(SessionStore);
  protected readonly theme = inject(ThemeService);
  protected readonly appVersion = APP_VERSION;

  protected readonly icUser = LucideUser;
  protected readonly icMenu = LucideMenu;
  protected readonly icClose = LucideX;
  protected readonly icSun = LucideSun;
  protected readonly icMoon = LucideMoon;

  protected readonly links: readonly NavLink[] = [
    { path: '/', label: 'Précommandes', exact: true },
    { path: '/fastpass', label: 'FastPass', exact: false },
    { path: '/faq', label: 'FAQ', exact: false },
    { path: '/contact', label: 'Contact', exact: false },
  ];

  protected readonly menuOpen = signal(false);

  protected readonly displayName = computed(() => {
    const user = this.session.user();
    if (user === null) return '';

    const full = [user.firstName, user.lastName].filter((part) => part !== null).join(' ');
    return full === '' ? user.email.split('@')[0] : full;
  });

  protected readonly themeLabel = computed(() =>
    this.theme.resolved() === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre',
  );

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected openAccountMenu(event: MouseEvent): void {
    this.dropdown.toggle({
      anchor: event.currentTarget as HTMLElement,
      placement: 'bottom-end',
      width: 210,
      header: this.session.user()?.email,
      items: [
        {
          type: 'action',
          icon: LucideQrCode,
          label: 'Mes commandes',
          onClick: () => void this.router.navigate(['/mes-commandes']),
        },
        { type: 'separator' },
        {
          type: 'action',
          icon: LucideLogOut,
          label: 'Déconnexion',
          danger: true,
          onClick: () => this.logout(),
        },
      ],
    });
  }

  protected logout(): void {
    this.session.logout();
    this.closeMenu();
    void this.router.navigate(['/']);
  }
}

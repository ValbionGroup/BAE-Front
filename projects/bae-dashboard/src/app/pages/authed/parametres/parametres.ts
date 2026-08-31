import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { LucideDynamicIcon, LucideMoon, LucideSettings, LucideSun } from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { selectMember, selectUser } from '#core/store/auth/auth.selector';
import { TelegramStore } from '#core/store/telegram.store';
import { ThemeService, Avatar, Badge, Btn, ExternalNavigation } from '@bae/ui';
import { ParametresSideNav } from './side-nav/side-nav';

interface ProfileRow {
  readonly k: string;
  readonly v: string;
}

@Component({
  selector: 'bfd-parametres',
  imports: [Avatar, Badge, Btn, ParametresSideNav, LucideDynamicIcon],
  templateUrl: './parametres.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Parametres {
  protected readonly theme = inject(ThemeService);
  private readonly store = inject(Store);
  private readonly telegram = inject(TelegramStore);
  private readonly navigation = inject(ExternalNavigation);

  private readonly user = this.store.selectSignal(selectUser);
  private readonly member = this.store.selectSignal(selectMember);

  constructor() {
    inject(PageHeaderService).set({
      title: 'Paramètres',
      breadcrumb: ['Espace', 'Paramètres'],
      activeNavId: 'set',
    });
  }

  protected readonly displayName = computed(() => {
    const member = this.member();
    const parts = [member?.firstName, member?.lastName].filter(
      (part): part is string => typeof part === 'string' && part.trim() !== '',
    );
    return parts.length > 0 ? parts.join(' ') : (this.user()?.email ?? '');
  });

  protected readonly roleLabel = computed(() => this.member()?.role ?? 'Sans rôle');

  protected readonly profileRows = computed<readonly ProfileRow[]>(() => {
    const member = this.member();
    return [
      { k: 'Email', v: this.user()?.email ?? '—' },
      { k: 'Rôle', v: this.roleLabel() },
      { k: 'Crédit de priorité', v: member ? String(member.points) : '—' },
    ];
  });

  protected readonly telegramBusy = this.telegram.busy;
  protected readonly telegramError = this.telegram.error;

  protected readonly telegramLinked = computed(() => this.user()?.telegram.linked === true);
  protected readonly telegramHandle = computed(() => this.user()?.telegram.handle ?? null);

  /**
   * On quitte l'application, comme pour le SSO : la liaison se termine dans
   * Telegram, et le retour recharge le profil tout seul.
   */
  protected async linkTelegram(): Promise<void> {
    const url = await this.telegram.startLink();
    if (url !== null) this.navigation.go(url);
  }

  protected async unlinkTelegram(): Promise<void> {
    await this.telegram.unlink();
  }

  protected readonly themeOptions = [
    { id: 'light' as const, label: 'Clair', icon: LucideSun, sub: 'Jour' },
    { id: 'dark' as const, label: 'Sombre', icon: LucideMoon, sub: 'Recommandé pour les soirées' },
    { id: 'system' as const, label: 'Système', icon: LucideSettings, sub: "Suit l'OS" },
  ];

  protected readonly activeTheme = computed(() => this.theme.mode());

  protected setTheme(id: 'light' | 'dark' | 'system'): void {
    this.theme.set(id);
  }
}

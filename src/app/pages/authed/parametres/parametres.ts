import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  LucideBell,
  LucideDynamicIcon,
  LucideIconInput,
  LucideLock,
  LucideMail,
  LucideMoon,
  LucideSettings,
  LucideShield,
  LucideSun,
  LucideUpload,
  LucideUser,
  LucideUsers,
  LucideZap,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { ThemeService } from '#core/services/theme/theme-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Field } from '#shared/components/ui/field/field';
import { Input } from '#shared/components/ui/input/input';
import { Toggle } from '#shared/components/ui/toggle/toggle';
import { Avatar } from '#shared/components/ui/avatar/avatar';

interface Section {
  readonly id: string;
  readonly l: string;
  readonly icon: LucideIconInput;
}

interface Module {
  readonly l: string;
  readonly s: string;
  readonly enabled: boolean;
  readonly beta: boolean;
}

@Component({
  selector: 'bfd-parametres',
  imports: [Btn, Badge, Field, Input, Toggle, Avatar, LucideDynamicIcon],
  templateUrl: './parametres.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Parametres {
  protected readonly theme = inject(ThemeService);

  constructor() {
    inject(PageHeaderService).set({
      title: 'Paramètres',
      breadcrumb: ['Espace', 'Paramètres'],
      activeNavId: 'set',
    });
  }

  protected readonly icUpload = LucideUpload;
  protected readonly icSun = LucideSun;
  protected readonly icMoon = LucideMoon;
  protected readonly icSettings = LucideSettings;

  protected readonly sections: readonly Section[] = [
    { id: 'profil', l: 'Profil', icon: LucideUser },
    { id: 'secu', l: 'Sécurité & 2FA', icon: LucideShield },
    { id: 'aff', l: 'Affichage', icon: LucideSun },
    { id: 'notif', l: 'Notifications', icon: LucideBell },
    { id: 'mods', l: 'Modules', icon: LucideSettings },
    { id: 'eq', l: 'Équipe & rôles', icon: LucideUsers },
    { id: 'int', l: 'Intégrations', icon: LucideZap },
  ];
  protected readonly activeSection = signal('profil');

  protected readonly twofa = signal(true);

  protected readonly modules: readonly Module[] = [
    { l: 'Précommandes en ligne', s: 'Page publique + paiement Lydia', enabled: true, beta: false },
    { l: 'Scan code-barres', s: 'Caméra mobile · ajout rapide', enabled: true, beta: false },
    { l: 'Prédictions IA', s: 'Estimation des commandes par soirée', enabled: true, beta: false },
    { l: 'Gestion des prêts', s: 'Bêta · matériel + caution', enabled: false, beta: true },
    {
      l: 'Connecteur HelloAsso',
      s: 'Cotisations en alternative à Lydia',
      enabled: false,
      beta: true,
    },
  ];

  protected readonly themeOptions = [
    { id: 'light' as const, label: 'Clair', icon: LucideSun, sub: 'Jour' },
    { id: 'dark' as const, label: 'Sombre', icon: LucideMoon, sub: 'Recommandé pour les soirées' },
    { id: 'system' as const, label: 'Système', icon: LucideSettings, sub: "Suit l'OS" },
  ];

  protected readonly activeTheme = computed(() => this.theme.mode());

  // Lucide directives also need imports
  protected readonly icMail = LucideMail;
  protected readonly icLock = LucideLock;

  protected setTheme(id: 'light' | 'dark' | 'system'): void {
    this.theme.set(id);
  }
}

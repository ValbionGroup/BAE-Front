import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  LucideDynamicIcon,
  LucideMail,
  LucideMoon,
  LucideSettings,
  LucideSun,
  LucideUpload,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { ThemeService } from '#core/services/theme/theme-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Field } from '#shared/components/ui/field/field';
import { Input } from '#shared/components/ui/input/input';
import { Avatar } from '#shared/components/ui/avatar/avatar';
import { ParametresSideNav } from './side-nav/side-nav';

interface Module {
  readonly l: string;
  readonly s: string;
  readonly enabled: boolean;
  readonly beta: boolean;
}

@Component({
  selector: 'bfd-parametres',
  imports: [Btn, Field, Input, Avatar, ParametresSideNav, LucideDynamicIcon],
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

  protected readonly themeOptions = [
    { id: 'light' as const, label: 'Clair', icon: LucideSun, sub: 'Jour' },
    { id: 'dark' as const, label: 'Sombre', icon: LucideMoon, sub: 'Recommandé pour les soirées' },
    { id: 'system' as const, label: 'Système', icon: LucideSettings, sub: "Suit l'OS" },
  ];

  protected readonly activeTheme = computed(() => this.theme.mode());

  protected readonly icMail = LucideMail;

  protected setTheme(id: 'light' | 'dark' | 'system'): void {
    this.theme.set(id);
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideBell, LucideChevronRight, LucideMenu, LucideMoon, LucideSun } from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { ThemeService } from '#core/services/theme/theme-service';
import { BfdTooltip } from '#shared/components/tooltip/bfd-tooltip.directive';

@Component({
  selector: 'bfd-topbar',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    BfdTooltip,
    LucideBell,
    LucideChevronRight,
    LucideMenu,
    LucideMoon,
    LucideSun,
  ],
  templateUrl: './topbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Topbar {
  /** Ouvre le tiroir de navigation — visible sous `md` seulement. */
  readonly menuClick = output<void>();


  protected readonly theme = inject(ThemeService);
  private readonly pageHeader = inject(PageHeaderService);
  protected readonly header = this.pageHeader.header;
  protected readonly actions = this.pageHeader.actions;

  protected readonly themeTooltip = computed(() =>
    this.theme.mode() === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre',
  );
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideBell, LucideChevronRight, LucideMoon, LucideSun } from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { ThemeService } from '#core/services/theme/theme-service';

@Component({
  selector: 'bfd-topbar',
  imports: [LucideBell, LucideChevronRight, LucideMoon, LucideSun],
  templateUrl: './topbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Topbar {
  protected readonly theme = inject(ThemeService);
  private readonly pageHeader = inject(PageHeaderService);
  protected readonly header = this.pageHeader.header;
}

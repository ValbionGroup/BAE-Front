import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  LucideChevronRight,
  LucideDownload,
  LucideDynamicIcon,
  LucideFunnel,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Badge } from '#shared/components/ui/badge/badge';
import { Skeleton } from '#shared/components/ui/skeleton/skeleton';
import { AnalyseStore } from '#core/store/analyse.store';

@Component({
  selector: 'bfd-analyse',
  imports: [Badge, Skeleton, LucideDynamicIcon],
  templateUrl: './analyse.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Analyse {
  protected readonly store = inject(AnalyseStore);

  constructor() {
    inject(PageHeaderService).set({
      title: 'Analyse & historique',
      subtitle: 'Saison 2025-2026',
      breadcrumb: ['Suivi', 'Analyse'],
      activeNavId: 'ana',
    });
  }

  protected readonly icFilter = LucideFunnel;
  protected readonly icDownload = LucideDownload;
  protected readonly icChevronRight = LucideChevronRight;

  protected readonly isLoading = computed(() => {
    const s = this.store.loading();
    return s === 'init' || s === 'loading';
  });

  protected readonly chartMax = 380;
  protected readonly axisTicks = [0, 100, 200, 300];

  protected readonly skeletonKpis: readonly null[] = [null, null, null, null];
  protected readonly skeletonChartCols: readonly null[] = [null, null, null, null, null, null];
  protected readonly skeletonRows: readonly null[] = [null, null, null, null];

  protected barHeight(v: number): number {
    return (v / this.chartMax) * 158;
  }

  protected tickBottom(tick: number): number {
    return 22 + (tick / this.chartMax) * 158;
  }
}

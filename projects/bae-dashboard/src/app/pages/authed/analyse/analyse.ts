import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  computed,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  LucideChevronRight,
  LucideDownload,
  LucideDynamicIcon,
  LucideFunnel,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Badge, DropdownService, Skeleton, formatCents } from '@bae/ui';
import { AnalyseStore } from '#core/store/analyse.store';
import type { AnalyseSoiree } from '#core/models/analyse.model';

/** Palier des graduations : le maximum est arrondi au multiple supérieur. */
const AXIS_STEP = 50;

@Component({
  selector: 'bfd-analyse',
  imports: [Badge, Skeleton, LucideDynamicIcon],
  templateUrl: './analyse.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Analyse implements OnInit {
  protected readonly store = inject(AnalyseStore);
  private readonly router = inject(Router);
  private readonly pageHeader = inject(PageHeaderService);

  private readonly dropdown = inject(DropdownService);

  private readonly headerActions = viewChild.required<TemplateRef<unknown>>('headerActions');

  protected readonly subtitle = computed(() => this.store.season()?.label ?? 'Toutes les soirées');

  constructor() {
    effect(() => {
      this.pageHeader.set({
        title: 'Analyse & historique',
        subtitle: this.subtitle(),
        breadcrumb: ['Suivi', 'Analyse'],
        activeNavId: 'ana',
      });
      this.pageHeader.setActions(this.headerActions());
    });
  }

  ngOnInit(): void {
    void this.store.load();
  }

  protected readonly icFilter = LucideFunnel;
  protected readonly icDownload = LucideDownload;
  protected readonly icChevronRight = LucideChevronRight;

  protected readonly isLoading = computed(() => {
    const status = this.store.loading();
    return status === 'init' || status === 'loading';
  });

  /**
   * Le plus haut nombre de commandes arrondi au palier supérieur. Il valait
   * 380 en dur : une soirée au-dessus débordait la carte sans rien signaler.
   */
  protected readonly chartMax = computed(() => {
    const highest = Math.max(0, ...this.store.chart().map((col) => col.cmd));
    return Math.max(AXIS_STEP, Math.ceil(highest / AXIS_STEP) * AXIS_STEP);
  });

  protected readonly axisTicks = computed(() => {
    const max = this.chartMax();
    return [0, 1, 2, 3].map((step) => Math.round((max * step) / 4));
  });

  protected readonly skeletonKpis: readonly null[] = [null, null, null, null];
  protected readonly skeletonChartCols: readonly null[] = [null, null, null, null, null, null];
  protected readonly skeletonRows: readonly null[] = [null, null, null, null];

  protected barHeight(v: number): number {
    return (v / this.chartMax()) * 158;
  }

  protected tickBottom(tick: number): number {
    return 22 + (tick / this.chartMax()) * 158;
  }

  protected openSoiree(row: Pick<AnalyseSoiree, 'id' | 'clickable'>): void {
    if (!row.clickable) return;
    void this.router.navigate(['/soiree/bilan', row.id]);
  }

  protected openSeasons(event: MouseEvent): void {
    const anchor = event.currentTarget;
    if (!(anchor instanceof HTMLElement)) return;

    this.dropdown.toggle({
      anchor,
      placement: 'bottom-end',
      width: 220,
      header: 'Période',
      emptyLabel: 'Aucune saison',
      items: this.store.seasons().map((season) => ({
        type: 'action' as const,
        label: season.label,
        trailing: `${season.eventCount}`,
        onClick: () => void this.store.selectSeason(season.startYear),
      })),
    });
  }

  /**
   * Séparateur `;` : Excel en locale française lit la virgule comme décimale.
   * L'encaissé sort sans le symbole `€` — une cellule porteuse d'unité cesse
   * d'être un nombre, et ne se somme plus.
   */
  protected csvContent(): string {
    const header = 'Soirée;Date;Commandes;Encaissé;Présents;Répondants';
    const rows = this.store
      .soirees()
      .map((row) =>
        [
          row.n,
          row.d,
          row.pred ? '' : row.cmd,
          row.pred ? '' : formatCents(row.cashedCents),
          row.presentCount,
          row.respondentCount,
        ].join(';'),
      );
    return [header, ...rows].join('\n');
  }

  protected exportCsv(): void {
    const blob = new Blob([`\ufeff${this.csvContent()}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analyse-${this.store.season()?.startYear ?? 'saison'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

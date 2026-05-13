import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  LucideChevronRight,
  LucideDownload,
  LucideDynamicIcon,
  LucideFilter,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Badge } from '#shared/components/ui/badge/badge';

interface Soiree {
  readonly n: string;
  readonly d: string;
  readonly rev: string;
  readonly cmd: number | string;
  readonly pred: boolean;
}

interface ChartCol {
  readonly d: string;
  readonly cmd: number;
  readonly pred: boolean;
}

@Component({
  selector: 'bfd-analyse',
  imports: [Badge, LucideDynamicIcon],
  templateUrl: './analyse.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Analyse {
  constructor() {
    inject(PageHeaderService).set({
      title: 'Analyse & historique',
      subtitle: 'Saison 2025-2026',
      breadcrumb: ['Suivi', 'Analyse'],
      activeNavId: 'ana',
    });
  }

  protected readonly icFilter = LucideFilter;
  protected readonly icDownload = LucideDownload;
  protected readonly icChevronRight = LucideChevronRight;

  protected readonly kpis = [
    { label: 'Revenus saison', value: '7 900 €', delta: '+18% vs n-1', deltaClass: 'text-ok' },
    { label: 'Commandes/soirée (moy.)', value: '285', delta: 'σ ±48', deltaClass: 'text-muted' },
    { label: 'Panier moyen', value: '5,80 €', delta: '+0,40 €', deltaClass: 'text-ok' },
    { label: 'Taux de présence', value: '92%', delta: '−3 pts', deltaClass: 'text-warn' },
  ];

  protected readonly soirees: readonly Soiree[] = [
    { n: 'Hivernale 2026', d: '14/02', rev: '—', cmd: '?', pred: true },
    { n: 'Bienvenue 2026', d: '24/01', rev: '1 240 €', cmd: 218, pred: false },
    { n: 'Noël BAE 2025', d: '13/12', rev: '1 580 €', cmd: 286, pred: false },
    { n: 'Halloween 2025', d: '31/10', rev: '1 410 €', cmd: 251, pred: false },
    { n: 'Rentrée 2025', d: '20/09', rev: '1 720 €', cmd: 318, pred: false },
    { n: "Fin d'année 2025", d: '18/06', rev: '1 950 €', cmd: 354, pred: false },
  ];

  protected readonly chart: readonly ChartCol[] = [
    { d: '18/06', cmd: 354, pred: false },
    { d: '20/09', cmd: 318, pred: false },
    { d: '31/10', cmd: 251, pred: false },
    { d: '13/12', cmd: 286, pred: false },
    { d: '24/01', cmd: 218, pred: false },
    { d: '14/02', cmd: 290, pred: true },
  ];

  protected readonly chartMax = 380;
  protected readonly axisTicks = [0, 100, 200, 300];

  protected barHeight(v: number): number {
    return (v / this.chartMax) * 158;
  }

  protected tickBottom(tick: number): number {
    return 22 + (tick / this.chartMax) * 158;
  }
}

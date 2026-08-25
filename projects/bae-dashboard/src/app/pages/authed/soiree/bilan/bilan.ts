import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { lastValueFrom } from 'rxjs';
import {
  LucideDownload,
  LucideDynamicIcon,
  LucideTicket,
  LucideTriangleAlert,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import {
  EventSummaryService,
  type EventSummary,
} from '#core/services/summary/event-summary-service';
import { EventsStore } from '#core/store/events.store';
import { Badge, Btn, Card } from '@bae/ui';
import { PrintService } from '#core/services/print/print-service';

type LoadState = 'init' | 'loading' | 'loaded' | 'error';

const METHOD_LABEL: Record<string, string> = { cash: 'Espèces', lydia: 'Lydia' };

@Component({
  selector: 'bfd-soiree-bilan',
  imports: [Badge, Btn, Card, LucideDynamicIcon],
  templateUrl: './bilan.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
})
export class SoireeBilan implements OnInit {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly summaryService = inject(EventSummaryService);
  private readonly events = inject(EventsStore);
  private readonly printService = inject(PrintService);

  protected readonly icTicket = LucideTicket;
  protected readonly icAlert = LucideTriangleAlert;
  protected readonly icDownload = LucideDownload;

  protected readonly loadState = signal<LoadState>('init');
  protected readonly loadError = signal<string | null>(null);
  protected readonly summary = signal<EventSummary | null>(null);

  /**
   * Un bilan se lit **après** la soirée : on vise donc la dernière clôturée, et
   * la soirée en cours seulement à défaut. Prendre `activeEvent` en premier
   * afficherait un bilan vide tous les soirs de service.
   */
  protected readonly target = computed(() => {
    const all = this.events.allEvents();
    const completed = all
      .filter((event) => event.status === 'completed')
      .sort((a, b) => timeOf(b.date) - timeOf(a.date));

    return completed[0] ?? this.events.activeEvent() ?? null;
  });

  constructor() {
    this.pageHeader.set({
      title: 'Bilan de soirée',
      subtitle: 'Ce qui a été produit, vendu et encaissé',
      breadcrumb: ['Analyse', 'Soirées'],
      activeNavId: 'soir',
    });

    effect(() => {
      const eventId = this.target()?.id ?? null;
      untracked(() => void this.refresh(eventId));
    });
  }

  ngOnInit(): void {
    void this.events.load();
  }

  protected readonly kpis = computed(() => {
    const summary = this.summary();
    if (summary === null) return [];

    const averageCents =
      summary.orderCount > 0 ? Math.round(summary.revenueCents / summary.orderCount) : 0;

    return [
      {
        label: 'Recette',
        value: `${money(summary.revenueCents)} €`,
        detail:
          summary.sponsoredCents > 0
            ? `dont ${money(summary.sponsoredCents)} € à recouvrer`
            : 'valeur au prix public',
      },
      {
        label: 'Commandes',
        value: String(summary.orderCount),
        detail: `${summary.cancelledCount} annulée(s)`,
      },
      { label: 'Panier moyen', value: `${money(averageCents)} €`, detail: 'recette / commandes' },
      {
        label: 'Invendus',
        value: String(summary.lines.reduce((total, line) => total + line.unsoldQty, 0)),
        detail: 'produits non vendus',
      },
    ];
  });

  protected readonly cashed = computed(() =>
    (this.summary()?.cashedByMethod ?? []).map((entry) => ({
      label: METHOD_LABEL[entry.method] ?? entry.method,
      amount: money(entry.amount),
      count: entry.count,
    })),
  );

  /** Total réellement encaissé, à comparer à la recette — l'écart est informatif. */
  protected readonly cashedTotal = computed(() =>
    (this.summary()?.cashedByMethod ?? []).reduce((total, entry) => total + entry.amount, 0),
  );

  protected readonly gap = computed(() => {
    const summary = this.summary();
    if (summary === null) return 0;
    return this.cashedTotal() - summary.revenueCents;
  });

  /** Non nul = une association doit de l'argent au BAE sur cette soirée. */
  protected readonly receivable = computed(() => {
    const summary = this.summary();
    if (summary === null || summary.sponsoredCents === 0) return null;

    return {
      payerName: summary.payerName ?? 'payeur non renseigné',
      total: money(summary.sponsoredCents),
      cashed: money(summary.cashedCents),
      categories: summary.receivableByCategory.map((entry) => ({
        label: entry.label,
        due: money(entry.dueCents),
      })),
    };
  });

  protected downloadStatement(): void {
    const event = this.target();
    if (!event) return;
    this.printService.download(`/events/${event.id}/receivables/pdf`, 'justificatif.pdf');
  }

  protected readonly products = computed(() =>
    [...(this.summary()?.lines ?? [])]
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .map((line) => ({
        name: line.productName,
        planned: line.plannedQty,
        produced: line.producedQty,
        sold: line.soldQty,
        unsold: line.unsoldQty,
        revenue: money(line.revenueCents),
      })),
  );

  protected money(value: number): string {
    return money(value);
  }

  private async refresh(eventId: string | null): Promise<void> {
    if (eventId === null) {
      this.summary.set(null);
      this.loadState.set('loaded');
      return;
    }

    this.loadState.set('loading');
    this.loadError.set(null);
    try {
      this.summary.set(await lastValueFrom(this.summaryService.get(eventId)));
      this.loadState.set('loaded');
    } catch {
      this.summary.set(null);
      this.loadError.set('Impossible de charger le bilan.');
      this.loadState.set('error');
    }
  }
}

/**
 * Formate des **centimes** en euros, séparateur de milliers compris.
 *
 * Conservé plutôt que remplacé par `formatCents` de `@bae/ui` : celui-ci fait un
 * simple `toFixed`, et une recette de soirée se lit mal en « 1234,56 ».
 */
function money(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Une date invalide part en dernier plutôt que de désordonner tout le tri. */
function timeOf(date: unknown): number {
  const time = new Date(String(date)).getTime();
  return Number.isNaN(time) ? 0 : time;
}

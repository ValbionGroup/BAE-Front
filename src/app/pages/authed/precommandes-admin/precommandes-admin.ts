import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { lastValueFrom } from 'rxjs';
import {
  LucideCheck,
  LucideChevronRight,
  LucideClock,
  LucideDynamicIcon,
  LucideFunnel,
  LucideQrCode,
  LucideScanLine,
  LucideTriangleAlert,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { PreOrdersService } from '#core/services/pre-orders/pre-orders-service';
import { EventsStore } from '#core/store/events.store';
import type { PreOrderTicket } from '#core/models/pre-order.model';
import type { OrderStatus } from '#core/models/order.model';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';
import { Card } from '#shared/components/ui/card/card';
import { Input } from '#shared/components/ui/input/input';

interface PickingLine {
  readonly name: string;
  readonly quantity: number;
  readonly done: boolean;
}

/** Une précommande, telle que l'écran l'affiche. Dérivée, jamais saisie. */
interface Ticket {
  readonly id: number;
  readonly reference: string;
  readonly client: string;
  readonly itemCount: number;
  readonly paid: boolean;
  readonly status: OrderStatus;
  readonly pickupLabel: string;
  readonly due: boolean;
  readonly picking: readonly PickingLine[];
}

interface SlotGroup {
  readonly label: string;
  readonly imminent: boolean;
  readonly tickets: readonly Ticket[];
}

type LoadState = 'init' | 'loading' | 'loaded' | 'error';

const FILTERS = ['Toutes', 'À préparer', 'En cours', 'Prêtes'] as const;
type Filter = (typeof FILTERS)[number];

@Component({
  selector: 'bfd-precommandes-admin',
  imports: [Btn, Badge, Card, Input, LucideDynamicIcon],
  templateUrl: './precommandes-admin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
})
export class PrecommandesAdmin implements OnInit {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly preOrders = inject(PreOrdersService);
  private readonly events = inject(EventsStore);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  protected readonly icFilter = LucideFunnel;
  protected readonly icScan = LucideScanLine;
  protected readonly icCheck = LucideCheck;
  protected readonly icChevRight = LucideChevronRight;
  protected readonly icClock = LucideClock;
  protected readonly icQr = LucideQrCode;
  protected readonly icAlert = LucideTriangleAlert;

  protected readonly filters = FILTERS;
  protected readonly activeFilter = signal<Filter>('Toutes');
  protected readonly loadState = signal<LoadState>('init');
  protected readonly loadError = signal<string | null>(null);
  protected readonly selectedId = signal<number | null>(null);
  private readonly tickets = signal<readonly PreOrderTicket[]>([]);

  protected readonly activeEvent = this.events.activeEvent;

  constructor() {
    this.pageHeader.set({
      title: 'Précommandes · gestion interne',
      subtitle: 'Retraits de la soirée en cours',
      breadcrumb: ['Soirée', 'Précommandes', 'Gestion'],
      activeNavId: 'pre',
    });

    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });

    // ⚠️ Dépendre de l'**identifiant** et non de l'objet : `activeEvent` dérive
    // du dictionnaire que `load()` remplace, donc en dépendre créerait une
    // rétroaction. `untracked` couvre le préambule synchrone de l'appel async,
    // qui relit ce dictionnaire avant son premier `await`.
    effect(() => {
      const eventId = this.events.activeEventId();
      if (eventId === null) {
        untracked(() => {
          this.tickets.set([]);
          this.loadState.set('loaded');
        });
        return;
      }
      untracked(() => void this.refresh(eventId));
    });
  }

  ngOnInit(): void {
    void this.events.load();
  }

  protected readonly visibleTickets = computed<readonly Ticket[]>(() => {
    const filter = this.activeFilter();
    return this.tickets()
      .filter((ticket) => matchesFilter(ticket, filter))
      .map(toTicket);
  });

  /**
   * Regroupe par heure de retrait. `imminent` vient de `due`, **calculé côté
   * serveur** : le front n'a pas à connaître le délai de préparation, et deux
   * horloges donneraient deux réponses.
   */
  protected readonly slotGroups = computed<readonly SlotGroup[]>(() => {
    const groups = new Map<string, Ticket[]>();
    for (const ticket of this.visibleTickets()) {
      const bucket = groups.get(ticket.pickupLabel) ?? [];
      bucket.push(ticket);
      groups.set(ticket.pickupLabel, bucket);
    }

    return [...groups.entries()]
      .map(([label, tickets]) => ({
        label,
        imminent: tickets.some((ticket) => ticket.due),
        tickets,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  });

  protected readonly counts = computed(() => {
    const all = this.tickets();
    return {
      total: all.length,
      ready: all.filter((ticket) => ticket.status === 'ready').length,
      inProgress: all.filter((ticket) => ticket.status === 'in_progress').length,
    };
  });

  protected readonly selected = computed<Ticket | null>(() => {
    const id = this.selectedId();
    if (id === null) return null;
    return this.visibleTickets().find((ticket) => ticket.id === id) ?? null;
  });

  protected readonly doneCount = computed(
    () => this.selected()?.picking.filter((line) => line.done).length ?? 0,
  );

  protected select(id: number): void {
    this.selectedId.set(id);
  }

  protected setFilter(filter: Filter): void {
    this.activeFilter.set(filter);
  }

  protected statusBadge(status: OrderStatus): { kind: BadgeKind; dot: boolean; label: string } {
    switch (status) {
      case 'ready':
        return { kind: 'ok', dot: true, label: 'Prête' };
      case 'in_progress':
        return { kind: 'warn', dot: true, label: 'En préparation' };
      case 'completed':
        return { kind: 'neutral', dot: false, label: 'Retirée' };
      case 'cancelled':
        return { kind: 'danger', dot: false, label: 'Annulée' };
      default:
        return { kind: 'neutral', dot: false, label: 'À préparer' };
    }
  }

  protected async markReady(): Promise<void> {
    await this.transition('ready');
  }

  protected async hold(): Promise<void> {
    await this.transition('in_progress');
  }

  protected async cancel(): Promise<void> {
    await this.transition('cancelled');
  }

  /**
   * ⚠️ Remettre la commande passe par `collect()` et **non** par un statut :
   * lui seul écrit `received_quantity`. Marquer « terminé » sans lui laisserait
   * un ticket clos sans que rien n'ait changé de mains.
   */
  protected async collect(): Promise<void> {
    const ticket = this.selected();
    if (ticket === null) return;
    await this.mutate(() => lastValueFrom(this.preOrders.collect(ticket.id)));
  }

  private async transition(status: OrderStatus): Promise<void> {
    const ticket = this.selected();
    if (ticket === null) return;
    await this.mutate(() => lastValueFrom(this.preOrders.setStatus(ticket.id, status)));
  }

  private async mutate(action: () => Promise<PreOrderTicket>): Promise<void> {
    try {
      const updated = await action();
      // Remplacement ciblé plutôt qu'un rechargement complet : la liste est
      // triée et regroupée, un aller-retour ferait sauter la sélection.
      this.tickets.update((list) =>
        list.map((ticket) => (ticket.id === updated.id ? updated : ticket)),
      );
    } catch {
      // Le serveur garde la table des transitions : un refus est légitime, pas
      // une panne. On resynchronise plutôt que d'insister.
      const eventId = this.events.activeEventId();
      if (eventId !== null) await this.refresh(eventId);
    }
  }

  private async refresh(eventId: string): Promise<void> {
    this.loadState.set('loading');
    this.loadError.set(null);
    try {
      const list = await lastValueFrom(this.preOrders.list(eventId));
      this.tickets.set(list);
      this.loadState.set('loaded');
    } catch {
      this.tickets.set([]);
      this.loadError.set('Impossible de charger les précommandes.');
      this.loadState.set('error');
    }
  }
}

function matchesFilter(ticket: PreOrderTicket, filter: Filter): boolean {
  switch (filter) {
    case 'À préparer':
      return ticket.status === 'pending';
    case 'En cours':
      return ticket.status === 'in_progress';
    case 'Prêtes':
      return ticket.status === 'ready';
    default:
      return true;
  }
}

/** Sans heure choisie, la commande est retirable dès l'ouverture. */
const NO_SLOT = 'Sans heure';

function toTicket(ticket: PreOrderTicket): Ticket {
  return {
    id: ticket.id,
    reference: ticket.reference,
    client: ticket.clientName,
    itemCount: ticket.lines.reduce((total, line) => total + line.quantity, 0),
    paid: ticket.paid,
    status: ticket.status,
    pickupLabel: formatSlot(ticket.pickupAt),
    due: ticket.due,
    picking: ticket.lines.map((line) => ({
      name: line.productName,
      quantity: line.quantity,
      done: line.receivedQuantity >= line.quantity,
    })),
  };
}

function formatSlot(pickupAt: string | null): string {
  if (pickupAt === null) return NO_SLOT;
  const date = new Date(pickupAt);
  if (Number.isNaN(date.getTime())) return NO_SLOT;
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

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
  LucideTriangleAlert,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { PreOrdersService } from '#core/services/pre-orders/pre-orders-service';
import { EventsStore } from '#core/store/events.store';
import type { PreOrderTicket } from '#core/models/pre-order.model';
import type { OrderStatus } from '#core/models/order.model';
import {
  Btn,
  Badge,
  BadgeKind,
  Card,
  buildPickupSlots,
  formatPickupSlot,
  messageOf,
  pickupWindowEnd,
  type PickupSlot,
} from '@bae/ui';

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
  /** ISO brut, pour reconnaître le créneau courant dans la liste. */
  readonly pickupAt: string | null;
  readonly due: boolean;
  readonly preparationNote: string | null;
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

import { PageAction, PageActions } from '#shared/components/page-actions/page-actions';

@Component({
  selector: 'bfd-precommandes-admin',
  imports: [Btn, Badge, Card, LucideDynamicIcon, PageActions],
  templateUrl: './precommandes-admin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
})
export class PrecommandesAdmin implements OnInit {
  protected readonly pageActions = computed<readonly PageAction[]>(() => [
    {
      label: 'Marquer prête',
      icon: this.icCheck,
      kind: 'primary',
      primary: true,
      run: () => this.markReady(),
    },
  ]);

  private readonly pageHeader = inject(PageHeaderService);
  private readonly preOrders = inject(PreOrdersService);
  private readonly events = inject(EventsStore);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  protected readonly icFilter = LucideFunnel;
  protected readonly icCheck = LucideCheck;
  protected readonly icChevRight = LucideChevronRight;
  protected readonly icClock = LucideClock;
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
    // `refresh()` : ces écrans suivent la soirée en cours, et `load()` ne relit
    // rien une fois le dictionnaire chargé.
    void this.events.refresh();
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

  /**
   * Les créneaux proposables de la soirée.
   *
   * Le back reste l'autorité — il refuse un créneau mal aligné ou hors soirée.
   * Cette liste ne fait que proposer, d'où le partage du même utilitaire avec la
   * zone publique : ce que le client choisit, le staff doit pouvoir le reprendre.
   */
  protected readonly pickupSlots = computed<readonly PickupSlot[]>(() => {
    const start = this.activeEvent()?.date;
    // Une soirée sans date n'est pas censée exister, mais une exception dans un
    // `computed` viderait tout le panneau plutôt que ce seul bloc.
    if (!(start instanceof Date) || Number.isNaN(start.getTime())) return [];

    const startIso = start.toISOString();
    const duration = this.activeEvent()?.duration ?? null;
    return buildPickupSlots(startIso, pickupWindowEnd(startIso, duration));
  });

  protected readonly savingPickup = signal(false);

  protected readonly pickupError = signal<string | null>(null);

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

  /**
   * Déplace le créneau de la commande sélectionnée. `null` le retire.
   *
   * Modifiable jusqu'au retrait : le cas d'usage n'est pas la saisie initiale
   * mais le décalage — la cuisine prend du retard, les créneaux annoncés
   * suivent.
   */
  protected async setPickup(pickupAt: string | null): Promise<void> {
    const ticket = this.selected();
    if (ticket === null || this.savingPickup()) return;

    this.savingPickup.set(true);
    this.pickupError.set(null);
    try {
      await this.mutate(() => lastValueFrom(this.preOrders.setPickup(ticket.id, pickupAt)));
    } finally {
      this.savingPickup.set(false);
    }
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
    } catch (error) {
      // Le serveur garde la table des transitions : un refus est légitime, pas
      // une panne. On resynchronise plutôt que d'insister.
      this.pickupError.set(messageOf(error, 'Ce changement a été refusé.'));
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
    pickupAt: ticket.pickupAt,
    due: ticket.due,
    preparationNote: ticket.preparationNote,
    picking: ticket.lines.map((line) => ({
      name: line.productName,
      quantity: line.quantity,
      done: line.receivedQuantity >= line.quantity,
    })),
  };
}

function formatSlot(pickupAt: string | null): string {
  if (pickupAt === null) return NO_SLOT;
  const label = formatPickupSlot(pickupAt);
  return label === '—' ? NO_SLOT : label;
}

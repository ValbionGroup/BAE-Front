import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { lastValueFrom } from 'rxjs';
import {
  LucideBell,
  LucideCheck,
  LucideClock,
  LucideDynamicIcon,
  LucideLock,
  LucideScanLine,
  LucideTriangleAlert,
  LucideZap,
} from '@lucide/angular';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { EventsStore } from '#core/store/events.store';
import { selectPermissions } from '#core/store/auth/auth.selector';
import type { Permission } from '#core/models/permission.model';
import {
  ProductionService,
  type ProductionLine,
} from '#core/services/production/production-service';
import { ModalService } from '#shared/components/modal/modal.service';
import { ProductionRunModal } from '#shared/components/modal/production-run-modal/production-run-modal';
import { ProductionReturnModal } from '#shared/components/modal/production-return-modal/production-return-modal';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Logo } from '#shared/components/ui/logo/logo';
import { OrdersStore } from '#core/store/orders.store';
import { WebsocketService } from '#core/services/websocket/websocket-service';
import { nextStatus, type Order, type OrderStatus } from '#core/models/order.model';
import type { PreOrderTicket } from '#core/models/pre-order.model';
import { formatCents } from '#shared/utils/money';
import { stockLevelOf, type StockLevel } from '#shared/utils/stock-level';

const WATCH_ORDER_SECONDS = 180;
const LATE_ORDER_SECONDS = 300;
const RANK: Record<StockLevel, number> = { out: 0, low: 1, unknown: 2, ok: 3 };
const AUTONOMY_MIN_MINUTES = 10;
const AUTONOMY_MIN_SALES = 5;

function autonomyOf(remainingQty: number, soldQty: number, minutes: number): string | null {
  if (remainingQty <= 0) return null;
  if (minutes < AUTONOMY_MIN_MINUTES || soldQty < AUTONOMY_MIN_SALES) return null;

  const perMinute = soldQty / minutes;
  if (perMinute <= 0) return null;
  return formatAutonomy(remainingQty / perMinute);
}

function formatAutonomy(minutes: number): string {
  // Au-delà, la soirée finira avant le stock : le chiffre exact n'apprend rien.
  if (minutes > 180) return '> 3 h';
  if (minutes < 90) return `~${Math.round(minutes / 5) * 5 || 5} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round((minutes % 60) / 15) * 15;
  return rest === 0 || rest === 60 ? `~${hours + (rest === 60 ? 1 : 0)} h` : `~${hours} h ${rest}`;
}

function formatElapsed(seconds: number): string {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

interface KitchenTicket {
  readonly key: string;
  readonly kind: 'order' | 'pre_order';
  readonly id: number;
  readonly reference: string;
  readonly clientName: string;
  readonly lines: readonly { productId: number; productName: string; quantity: number }[];
  readonly status: OrderStatus;
  readonly payment: string | null;
  readonly since: string | null;
  readonly pickupAt: string | null;
  readonly warning: string | null;
}

function ticketOfOrder(order: Order): KitchenTicket {
  return {
    key: `o${order.id}`,
    kind: 'order',
    id: order.id,
    reference: String(order.number),
    clientName: order.clientName,
    lines: order.lines,
    status: order.status,
    payment: `${formatCents(order.totalCents)} €`,
    since: order.createdAt,
    pickupAt: null,
    warning: null,
  };
}

function ticketOfPreOrder(preOrder: PreOrderTicket): KitchenTicket {
  return {
    key: `p${preOrder.id}`,
    kind: 'pre_order',
    id: preOrder.id,
    reference: preOrder.reference,
    clientName: preOrder.clientName,
    lines: preOrder.lines,
    status: preOrder.status,
    payment: preOrder.paid ? 'Payée à la commande' : null,
    since: null,
    pickupAt: preOrder.pickupAt,
    warning: preOrder.paid ? null : 'Aucun paiement rattaché',
  };
}

function merge(preOrders: readonly PreOrderTicket[], orders: readonly Order[]): KitchenTicket[] {
  return [...preOrders.map(ticketOfPreOrder), ...orders.map(ticketOfOrder)];
}

@Component({
  selector: 'bfd-soiree-live',
  imports: [Btn, Badge, Logo, LucideDynamicIcon],
  templateUrl: './live.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoireeLive implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly events = inject(EventsStore);
  private readonly production = inject(ProductionService);
  private readonly modal = inject(ModalService);
  private readonly realtime = inject(WebsocketService);

  private readonly permissions = inject(Store).selectSignal(selectPermissions);

  private has(permission: Permission): boolean {
    return this.permissions().includes(permission);
  }

  /**
   * La page est ouverte à qui porte `order:serve` — consulter la file et faire
   * avancer un ticket. Ses gestes lourds, eux, appartiennent à d'autres postes,
   * et un bouton qui finirait en 403 vaut moins que pas de bouton du tout.
   */
  protected readonly canProduce = computed<boolean>(() => this.has('stock:write'));

  /**
   * Clôturer enchaîne deux choses : le retour en stock (`POST
   * /production-returns`, donc `stock:write`) puis l'atterrissage sur le bilan,
   * dont la route exige `event:settle`. Il faut les deux, sinon la clôture
   * s'arrête à mi-chemin.
   */
  protected readonly canSettle = computed<boolean>(
    () => this.has('stock:write') && this.has('event:settle'),
  );

  /** La caisse est une autre route, gardée : sans le droit, le lien rebondit. */
  protected readonly canCashier = computed<boolean>(() => this.has('order:write'));

  /** Annuler touche à de l'argent déjà encaissé — c'est le poste caisse. */
  protected readonly canCancel = computed<boolean>(() => this.has('order:delete'));

  protected readonly icBell = LucideBell;
  protected readonly icScan = LucideScanLine;
  protected readonly icLock = LucideLock;
  protected readonly icAlert = LucideTriangleAlert;
  protected readonly icClock = LucideClock;

  protected readonly currentEvent = this.events.activeEvent;
  protected readonly currentEventId = this.events.activeEventId;

  protected readonly productionLines = signal<readonly ProductionLine[]>([]);
  protected readonly productionStatus = signal<'init' | 'loading' | 'loaded' | 'error'>('init');

  /** L'horloge du comptoir. La seule donnée temps réel de cette page. */
  protected readonly now = signal<number>(Date.now());

  protected readonly wallClock = computed(() =>
    new Date(this.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  );

  /** L'heure de début, lue sur la soirée — plus jamais une constante. */
  protected readonly startsAt = computed(() => {
    const date = this.currentEvent()?.date;
    if (!date || Number.isNaN(date.getTime())) return null;
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  });

  protected readonly serviceMinutes = computed(() => {
    const date = this.currentEvent()?.date;
    if (!date || Number.isNaN(date.getTime())) return 0;
    return Math.max(0, (this.now() - date.getTime()) / 60_000);
  });

  protected readonly totalPlanned = computed(() =>
    this.productionLines().reduce((sum, line) => sum + line.plannedQty, 0),
  );

  protected readonly totalProduced = computed(() =>
    this.productionLines().reduce((sum, line) => sum + line.producedQty, 0),
  );

  protected readonly orders = inject(OrdersStore);

  /**
   * Encaissé du service. Les commandes annulées en sont exclues.
   */
  protected readonly cashedCents = computed(() =>
    this.orders
      .orders()
      .filter((order) => order.status !== 'cancelled')
      .reduce((sum, order) => sum + order.totalCents, 0),
  );

  protected readonly ordersCount = computed(
    () => this.orders.orders().filter((order) => order.status !== 'cancelled').length,
  );

  /** Les dix dernières transactions, plus récentes d'abord. */
  protected readonly recentOrders = computed(() =>
    [...this.orders.orders()]
      .filter((order) => order.status !== 'cancelled')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10),
  );

  protected readonly averagePrepSeconds = computed<number | null>(() => {
    const served = this.orders.orders().filter((order) => order.status === 'completed');
    if (served.length === 0) return null;

    const total = served.reduce(
      (sum, order) =>
        sum +
        Math.max(0, new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime()) /
          1000,
      0,
    );
    return total / served.length;
  });

  protected readonly averagePrepLabel = computed(() => {
    const seconds = this.averagePrepSeconds();
    if (seconds === null) return '—';
    return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
  });

  protected readonly marginPercent = computed<number | null>(() => {
    const costs = new Map(
      (this.currentEvent()?.menu ?? []).map((item) => [item.productId, item.unitCost]),
    );

    let revenue = 0;
    let cost = 0;

    for (const order of this.orders.orders()) {
      if (order.status === 'cancelled') continue;
      for (const line of order.lines) {
        const unitCost = costs.get(line.productId);
        if (unitCost === null || unitCost === undefined) return null;
        revenue += line.unitPrice * line.quantity;
        cost += Math.round(unitCost * 100) * line.quantity;
      }
    }

    if (revenue === 0) return null;
    return Math.round(((revenue - cost) / revenue) * 100);
  });

  /** Encaissements par tranche de 5 minutes — la cadence de la maquette. */
  protected readonly cadence = computed(() => {
    const orders = this.orders.orders().filter((order) => order.status !== 'cancelled');
    if (orders.length === 0) return [] as number[];

    const now = this.now();
    const buckets = new Array<number>(18).fill(0);

    for (const order of orders) {
      const minutesAgo = (now - new Date(order.createdAt).getTime()) / 60_000;
      const index = buckets.length - 1 - Math.floor(minutesAgo / 5);
      if (index >= 0 && index < buckets.length) buckets[index] += 1;
    }
    return buckets;
  });

  protected readonly cadencePeak = computed(() => Math.max(1, ...this.cadence()));

  protected barHeight(value: number): number {
    return Math.max(2, (value / this.cadencePeak()) * 100);
  }

  protected timeOf(iso: string): string {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  protected summarize(order: Order): string {
    return order.lines.map((line) => `${line.productName} ×${line.quantity}`).join(' · ');
  }

  /**
   * Les trois colonnes du *kitchen display*, dans l'ordre du service. Une seule
   * définition : elles ne diffèrent que par leur libellé, leur teinte et le
   * geste qu'elles offrent.
   */
  protected readonly columns = computed(() => [
    {
      key: 'pending' as const,
      title: 'En attente',
      subtitle: 'à démarrer',
      short: 'attente',
      accent: 'bg-muted',
      tint: 'bg-bg',
      headerBg: 'border-muted bg-surface',
      actionIcon: LucideZap,
      action: 'Démarrer',
      tickets: merge(this.orders.pendingPreOrders(), this.orders.pending()),
    },
    {
      key: 'in_progress' as const,
      title: 'En préparation',
      subtitle: 'en cuisine',
      short: 'en prépa',
      accent: 'bg-warn',
      tint: 'bg-warn-soft/10',
      headerBg: 'border-warn bg-warn-soft/30',
      actionIcon: LucideCheck,
      action: 'Marquer prête',
      tickets: merge(this.orders.inProgressPreOrders(), this.orders.inProgress()),
    },
    {
      key: 'ready' as const,
      title: 'Prêtes · à servir',
      subtitle: 'appeler le client',
      short: 'prête',
      accent: 'bg-ok',
      tint: 'bg-ok-soft/10',
      headerBg: 'border-ok bg-ok-soft/30',
      actionIcon: LucideCheck,
      action: 'Remise au client',
      tickets: merge(this.orders.readyPreOrders(), this.orders.ready()),
    },
  ]);

  protected readonly productionRows = computed(() => {
    const sellable = new Map(this.orders.sellable().map((line) => [line.productId, line]));
    const minutes = this.serviceMinutes();

    return this.productionLines()
      .map((line) => {
        const stock = sellable.get(line.productId);
        const level = stock
          ? stockLevelOf(stock.remainingQty, stock.producedQty)
          : ('unknown' as StockLevel);

        return {
          ...line,
          level,
          remainingQty: level === 'unknown' ? null : (stock?.remainingQty ?? null),
          autonomy: autonomyOf(stock?.remainingQty ?? 0, stock?.soldQty ?? 0, minutes),
          percent: Math.round(this.progressPercent(line)),
          beyondPlan: line.plannedQty > 0 && line.producedQty >= line.plannedQty,
        };
      })
      .sort((a, b) => RANK[a.level] - RANK[b.level] || a.productName.localeCompare(b.productName));
  });

  protected readonly alerts = computed(() => {
    const stock = this.productionRows()
      .filter((row) => row.level === 'out' || row.level === 'low')
      .map((row) =>
        row.level === 'out'
          ? {
              key: `stock-${row.productId}`,
              kind: 'danger' as const,
              title: `${row.productName} — rupture`,
              detail: 'Plus rien à vendre au comptoir. Relancer une production.',
            }
          : {
              key: `stock-${row.productId}`,
              kind: 'warn' as const,
              title: `${row.productName} — stock critique`,
              detail: row.autonomy
                ? `Autonomie ${row.autonomy} · ${row.remainingQty} restants, à reprendre.`
                : `${row.remainingQty} restants, à reprendre.`,
            },
      );

    const late = this.orders
      .orders()
      .filter(
        (order) =>
          (order.status === 'pending' || order.status === 'in_progress') &&
          this.secondsSinceIso(order.createdAt) >= LATE_ORDER_SECONDS,
      )
      .map((order) => ({
        key: `late-${order.id}`,
        kind: 'warn' as const,
        title: `N°${order.number} · ${formatElapsed(this.secondsSinceIso(order.createdAt))} sans remise`,
        detail: 'Au-delà du seuil cuisine de 5 min.',
      }));

    return [...stock, ...late];
  });

  protected readonly activePreOrderCount = computed(
    () =>
      this.orders.pendingPreOrders().length +
      this.orders.inProgressPreOrders().length +
      this.orders.readyPreOrders().length,
  );

  /** L'heure de retrait, `—` quand le client n'en a pas choisi. */
  protected pickupLabel(ticket: KitchenTicket): string {
    if (ticket.pickupAt === null) return '—';
    return this.timeOf(ticket.pickupAt);
  }

  protected async advanceTicket(ticket: KitchenTicket): Promise<void> {
    const next = nextStatus(ticket.status);
    if (!next) return;

    if (ticket.kind === 'order') {
      await this.orders.advance(ticket.id, next);
      return;
    }

    if (next === 'completed') {
      await this.orders.collectPreOrder(ticket.id);
      return;
    }
    await this.orders.advancePreOrder(ticket.id, next);
  }

  protected async cancelTicket(ticket: KitchenTicket): Promise<void> {
    if (ticket.kind !== 'order') return;
    await this.orders.cancel(ticket.id);
  }

  protected ticketBorder(ticket: KitchenTicket): string {
    if (ticket.kind === 'pre_order') return 'border-blue/40 border-l-blue';
    if (ticket.status === 'ready') return 'border-ok/40 border-l-ok';
    if (this.secondsSince(ticket) >= LATE_ORDER_SECONDS) return 'border-danger/50 border-l-danger';
    if (ticket.status === 'in_progress') return 'border-border-s border-l-warn';
    return 'border-border-s border-l-muted';
  }

  private secondsSince(ticket: KitchenTicket): number {
    return ticket.since === null ? 0 : this.secondsSinceIso(ticket.since);
  }

  private secondsSinceIso(iso: string): number {
    return Math.max(0, (this.now() - new Date(iso).getTime()) / 1000);
  }

  /** Temps écoulé depuis la prise de commande, `m:ss`. */
  protected elapsed(ticket: KitchenTicket): string {
    return formatElapsed(this.secondsSince(ticket));
  }

  /** Seuils de la maquette : à surveiller à 3 minutes, urgent à 5. */
  protected timerColor(ticket: KitchenTicket): string {
    if (ticket.status === 'ready') return 'text-ok';
    const seconds = this.secondsSince(ticket);
    if (seconds >= LATE_ORDER_SECONDS) return 'text-danger';
    if (seconds >= WATCH_ORDER_SECONDS) return 'text-warn';
    return 'text-text';
  }

  protected readonly formatCents = formatCents;

  ngOnInit(): void {
    void this.events.load();
  }

  /**
   * Recharge les compteurs après un lancement ou une clôture.
   *
   * L'identifiant est passé explicitement depuis l'effect : le relire ici
   * ajouterait la dépendance que l'on vient précisément d'éviter.
   */
  protected async refreshProduction(eventId?: string): Promise<void> {
    const id = eventId ?? this.currentEventId();
    if (!id) return;
    this.productionStatus.set('loading');
    try {
      this.productionLines.set(await lastValueFrom(this.production.getRuns(id)));
      this.productionStatus.set('loaded');
    } catch {
      this.productionLines.set([]);
      this.productionStatus.set('error');
    }
  }

  protected openRun(line: ProductionLine): void {
    const event = this.currentEvent();
    if (!event) return;
    this.modal.open({
      type: 'component',
      component: ProductionRunModal,
      inputs: {
        eventId: event.id,
        productId: line.productId,
        productName: line.productName,
        plannedQty: line.plannedQty,
        producedQty: line.producedQty,
        onDone: () => {
          void this.refreshProduction();
          void this.orders.refreshSellable(event.id);
        },
      },
    });
  }

  protected closeNight(): void {
    const event = this.currentEvent();
    if (!event) return;
    this.modal.open({
      type: 'component',
      component: ProductionReturnModal,
      inputs: {
        eventId: event.id,
        eventName: event.name,
        onDone: () => {
          void this.refreshProduction();
          this.router.navigate(['/soiree/bilan']);
        },
      },
    });
  }

  protected openCaisse(): void {
    void this.router.navigate(['/caisse']);
  }

  /** La page étant hors app-shell, il faut une porte de sortie explicite. */
  protected leave(): void {
    void this.router.navigate(['/']);
  }

  protected progressPercent(line: ProductionLine): number {
    if (line.plannedQty <= 0) return 0;
    return Math.min(100, (line.producedQty / line.plannedQty) * 100);
  }

  constructor() {
    effect(() => {
      const id = this.currentEventId();
      if (!id) return;
      untracked(() => {
        void this.events.loadEventMenu(id);
        void this.refreshProduction(id);
        void this.orders.load(id);
        void this.realtime.subscribeToEvent(id);
      });
    });

    this.realtime.messages$.pipe(takeUntilDestroyed()).subscribe((message) => {
      if (message.type === 'pre_order.updated') {
        this.orders.upsertPreOrder(message.payload);
        return;
      }
      this.orders.upsert(message.payload);
    });

    const interval = setInterval(() => this.now.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => {
      clearInterval(interval);
      const id = this.currentEventId();
      if (id) void this.realtime.unsubscribeFromEvent(id);
    });
  }
}

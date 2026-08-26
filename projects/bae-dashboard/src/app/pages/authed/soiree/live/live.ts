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
import { Subject, auditTime, lastValueFrom } from 'rxjs';
import {
  LucideBell,
  LucideCheck,
  LucideClock,
  LucideDynamicIcon,
  LucideLock,
  LucidePlay,
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
import { Btn, Badge, Logo, ToastService, formatCents, messageOf } from '@bae/ui';
import { OrdersStore } from '#core/store/orders.store';
import { APP_VERSION } from '#app/app-version';
import { WebsocketService } from '#core/services/websocket/websocket-service';
import { nextStatus, type Order, type OrderStatus } from '#core/models/order.model';
import type { PreOrderTicket } from '#core/models/pre-order.model';
import { STOCK_AUDIT_MS, stockLevelOf, type StockLevel } from '#shared/utils/stock-level';

const WATCH_ORDER_SECONDS = 180;
const LATE_ORDER_SECONDS = 300;
const RANK: Record<StockLevel, number> = { out: 0, low: 1, unknown: 2, ok: 3 };
const AUTONOMY_MIN_MINUTES = 10;
const AUTONOMY_MIN_SALES = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Minuit local du jour de `date`, ou `NaN` si la date est illisible. */
function startOfDay(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

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
  protected readonly appVersion = APP_VERSION;

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly events = inject(EventsStore);
  private readonly production = inject(ProductionService);
  private readonly modal = inject(ModalService);
  private readonly realtime = inject(WebsocketService);
  private readonly toast = inject(ToastService);

  private readonly permissions = inject(Store).selectSignal(selectPermissions);

  private has(permission: Permission): boolean {
    return this.permissions().includes(permission);
  }

  protected readonly canProduce = computed<boolean>(() => this.has('stock:write'));

  protected readonly canSettle = computed<boolean>(
    () => this.has('stock:write') && this.has('event:settle'),
  );

  protected readonly canCashier = computed<boolean>(() => this.has('order:write'));

  protected readonly canCancel = computed<boolean>(() => this.has('order:delete'));

  /** Ouvrir relève de la préparation, clôturer de la consolidation des points. */
  protected readonly canOpen = computed<boolean>(() => this.has('event:write'));

  protected readonly icBell = LucideBell;
  protected readonly icScan = LucideScanLine;
  protected readonly icLock = LucideLock;
  protected readonly icPlay = LucidePlay;
  protected readonly icAlert = LucideTriangleAlert;
  protected readonly icClock = LucideClock;

  protected readonly currentEvent = this.events.activeEvent;
  protected readonly currentEventId = this.events.activeEventId;

  /**
   * De quoi entrer dans le cycle de vie quand l'écran n'a rien à piloter.
   *
   * C'est **le seul chemin d'entrée dans le service** : `activeEvent` ne retient
   * qu'une soirée `ongoing`, donc une soirée programmée pour ce soir n'ouvre
   * rien tant que personne ne l'a lancée d'ici.
   *
   * Hier y figure autant qu'aujourd'hui, pour **le passage de minuit** : une
   * soirée d'hier 22 h jamais ouverte doit rester lançable à 00 h 30.
   *
   * ⚠️ La fenêtre est **hier ou aujourd'hui, en jours civils**, et non « les 24
   * dernières heures » : une fenêtre glissante donne un résultat différent selon
   * l'heure à laquelle on la calcule — une soirée d'hier 22 h en sort à 22 h 01
   * le lendemain. Jamais au-delà d'aujourd'hui : préparer une soirée à venir
   * reste le rôle de la Logistique.
   */
  protected readonly openable = computed(() => {
    const today = startOfDay(new Date());
    const yesterday = today - DAY_MS;

    return this.events
      .allEvents()
      .filter((event) => {
        if (event.status !== 'scheduled') return false;
        const day = startOfDay(event.date);
        return day === today || day === yesterday;
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  });

  /** Refus serveur de la dernière ouverture — un 409 mérite d'être lu. */
  protected readonly openError = signal<string | null>(null);

  protected readonly productionLines = signal<readonly ProductionLine[]>([]);
  protected readonly productionStatus = signal<'init' | 'loading' | 'loaded' | 'error'>('init');

  protected readonly now = signal<number>(Date.now());

  protected readonly wallClock = computed(() =>
    new Date(this.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  );

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
   * Signale qu'une vente vient de changer ce qui reste à vendre.
   *
   * ⚠️ Le stock **n'est pas dérivable des commandes reçues** : `sellable` vient
   * du serveur, qui croise les lancements de production et les ventes non
   * annulées. Le recalculer ici à partir des tickets donnerait un second chiffre
   * qui dériverait du premier.
   */
  private readonly soldSomething = new Subject<void>();

  protected readonly cashedCents = computed(() =>
    this.orders
      .orders()
      .filter((order) => order.status !== 'cancelled')
      .reduce((sum, order) => sum + order.totalCents, 0),
  );

  protected readonly ordersCount = computed(
    () => this.orders.orders().filter((order) => order.status !== 'cancelled').length,
  );

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
        cost += unitCost * line.quantity;
      }
    }

    if (revenue === 0) return null;
    return Math.round(((revenue - cost) / revenue) * 100);
  });

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

  protected elapsed(ticket: KitchenTicket): string {
    return formatElapsed(this.secondsSince(ticket));
  }

  protected timerColor(ticket: KitchenTicket): string {
    if (ticket.status === 'ready') return 'text-ok';
    const seconds = this.secondsSince(ticket);
    if (seconds >= LATE_ORDER_SECONDS) return 'text-danger';
    if (seconds >= WATCH_ORDER_SECONDS) return 'text-warn';
    return 'text-text';
  }

  protected readonly formatCents = formatCents;

  /**
   * `refresh()` et non `load()` : un écran de service doit relire l'état des
   * soirées à chaque entrée. `load()` sort sans rien faire une fois le
   * dictionnaire chargé, si bien qu'une soirée clôturée ailleurs restait « en
   * cours » ici jusqu'à un rechargement complet de la page.
   */
  ngOnInit(): void {
    void this.events.refresh();
  }

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

  /**
   * Ouvre la soirée : c'est ce geste, et lui seul, qui met le comptoir et la
   * cuisine en service. `activeEvent` ne retient que les soirées `ongoing`, et
   * `ongoing` ne regarde pas la date — une soirée ouverte reste pilotable après
   * minuit.
   */
  protected async openNight(eventId: string): Promise<void> {
    this.openError.set(null);
    const result = await this.events.openEvent(eventId);

    if (result.ok) {
      this.toast.show({ type: 'success', title: 'Soirée ouverte' });
      return;
    }
    // Les deux : le bandeau pour l'état vide, où le refus explique pourquoi la
    // soirée choisie n'a pas pu être ouverte ; le toast pour l'en-tête, qui n'a
    // pas la place de porter une phrase.
    const message = messageOf(result.error, "L'ouverture de la soirée a échoué.");
    this.openError.set(message);
    this.toast.show({ type: 'error', title: 'Ouverture refusée', message });
  }

  /**
   * ⚠️ L'identifiant est capturé **avant** la clôture : une fois la soirée
   * `completed`, `activeEvent` vaut `null` et il n'y aurait plus rien à passer
   * au bilan.
   */
  protected closeNight(): void {
    const event = this.currentEvent();
    if (!event) return;
    const eventId = event.id;
    this.modal.open({
      type: 'component',
      component: ProductionReturnModal,
      inputs: {
        eventId,
        eventName: event.name,
        onDone: () => {
          void this.router.navigate(['/soiree/bilan', eventId]);
        },
      },
    });
  }

  protected openCaisse(): void {
    void this.router.navigate(['/caisse']);
  }

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
      // Un paiement par carte abouti diffuse **aussi** un `order.created` ; s'en
      // servir ici compterait la vente deux fois.
      if (message.type === 'card_payment.updated') return;

      this.orders.upsert(message.payload);

      // ⚠️ Le panneau de production restait figé sur les chiffres du chargement
      // de la page : les ventes arrivaient bien en cuisine, mais « il reste 12 »
      // ne bougeait pas et la rupture n'apparaissait qu'après un F5. Seules la
      // création et l'annulation déplacent le vendable — un changement de statut
      // en cuisine, non.
      if (message.type === 'order.created' || message.type === 'order.cancelled') {
        this.soldSomething.next();
      }
    });

    this.soldSomething.pipe(auditTime(STOCK_AUDIT_MS), takeUntilDestroyed()).subscribe(() => {
      const id = this.currentEventId();
      if (id) void this.orders.refreshSellable(id);
    });

    const interval = setInterval(() => this.now.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => {
      clearInterval(interval);
      const id = this.currentEventId();
      if (id) void this.realtime.unsubscribeFromEvent(id);
    });
  }
}

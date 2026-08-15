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
import { LucideBell, LucideLock, LucideScanLine } from '@lucide/angular';
import { Router } from '@angular/router';
import { EventsStore } from '#core/store/events.store';
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
import { nextStatus, type Order } from '#core/models/order.model';
import { formatCents } from '#shared/utils/money';

/**
 * Pilotage d'une soirée en service.
 *
 * La file de commandes reprend la disposition de `screen-soiree-live.jsx` — trois
 * colonnes, minuteurs colorés par seuil — mais pilotée par les données plutôt
 * que triplée en gabarit. Ce que la maquette montre et que rien n'alimente
 * (nom de client sur la carte, badge précommande, cases par ingrédient,
 * allergies) n'est pas rendu.
 *
 * La page vit **hors app-shell** (route dédiée) : c'est un poste de service en
 * plein écran, pas une page de navigation. Elle porte donc sa propre topbar.
 */
@Component({
  selector: 'bfd-soiree-live',
  imports: [Btn, Badge, Logo],
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

  protected readonly icBell = LucideBell;
  protected readonly icScan = LucideScanLine;
  protected readonly icLock = LucideLock;

  /**
   * La soirée que cette page pilote — `EventsStore.activeEvent`, la **même** que
   * celle sur laquelle la caisse s'ouvre. Deux dérivations séparées finiraient
   * par diverger, et on encaisserait sur une soirée pendant qu'on produirait
   * pour une autre.
   */
  protected readonly currentEvent = this.events.activeEvent;

  /**
   * ⚠️ **L'effect dépend de cet identifiant, jamais de `currentEvent()`.**
   *
   * `loadEventMenu()` fait un `patchState` sur le dictionnaire dont
   * `activeEvent` dérive : un effect qui lirait l'objet se réveillerait à chaque
   * chargement de menu et le relancerait. Une chaîne, elle, reste égale à
   * elle-même quand le dictionnaire est remplacé.
   */
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

  protected readonly totalPlanned = computed(() =>
    this.productionLines().reduce((sum, line) => sum + line.plannedQty, 0),
  );

  protected readonly totalProduced = computed(() =>
    this.productionLines().reduce((sum, line) => sum + line.producedQty, 0),
  );

  protected readonly orders = inject(OrdersStore);

  /**
   * Encaissé du service. Les commandes annulées en sont exclues — elles n'ont
   * rien rapporté, et un compteur qui les inclurait mentirait à la caisse.
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

  /**
   * Temps moyen entre la prise de commande et sa remise, sur les commandes
   * servies. `null` tant qu'aucune n'a abouti : afficher un zéro laisserait
   * croire à un service instantané.
   */
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

  /**
   * Marge du service : recette encaissée moins le coût des denrées vendues.
   *
   * ⚠️ **Deux unités différentes.** `unitPrice` est en centimes
   * (`event_products.price`, un entier) ; `unitCost` vient des prix fournisseurs,
   * un `decimal(10,2)` **en euros** — d'où le ×100. Les additionner tels quels
   * donnerait une marge absurde.
   *
   * ⚠️ `null` dès qu'une recette vendue n'a pas de coût connu (`unitCost` l'est
   * quand un ingrédient n'a aucun fournisseur). Une marge calculée sur un coût
   * partiel serait flatteuse et fausse — mieux vaut ne rien afficher.
   */
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
      action: 'Démarrer',
      orders: this.orders.pending(),
    },
    {
      key: 'in_progress' as const,
      title: 'En préparation',
      subtitle: 'en cuisine',
      short: 'en prépa',
      accent: 'bg-warn',
      tint: 'bg-warn-soft/10',
      headerBg: 'border-warn bg-warn-soft/30',
      action: 'Marquer prête',
      orders: this.orders.inProgress(),
    },
    {
      key: 'ready' as const,
      title: 'Prêtes · à servir',
      subtitle: 'appeler le client',
      short: 'prête',
      accent: 'bg-ok',
      tint: 'bg-ok-soft/10',
      headerBg: 'border-ok bg-ok-soft/30',
      action: 'Remise au client',
      orders: this.orders.ready(),
    },
  ]);

  /** Le liseré gauche vire au rouge dès qu'une commande traîne. */
  protected ticketBorder(order: Order): string {
    if (order.status === 'ready') return 'border-ok/40 border-l-ok';
    const seconds = (this.now() - new Date(order.createdAt).getTime()) / 1000;
    if (seconds >= 300) return 'border-danger/50 border-l-danger';
    if (order.status === 'in_progress') return 'border-border-s border-l-warn';
    return 'border-border-s border-l-muted';
  }

  /** Temps écoulé depuis la prise de commande, `m:ss`. */
  protected elapsed(order: Order): string {
    const seconds = Math.max(0, Math.floor((this.now() - new Date(order.createdAt).getTime()) / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  /** Seuils de la maquette : à surveiller à 3 minutes, urgent à 5. */
  protected timerColor(order: Order): string {
    if (order.status === 'ready') return 'text-ok';
    const seconds = (this.now() - new Date(order.createdAt).getTime()) / 1000;
    if (seconds >= 300) return 'text-danger';
    if (seconds >= 180) return 'text-warn';
    return 'text-text';
  }

  protected async advance(order: Order): Promise<void> {
    const next = nextStatus(order.status);
    if (next) await this.orders.advance(order.id, next);
  }

  protected async cancelOrder(order: Order): Promise<void> {
    await this.orders.cancel(order.id);
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
      // Un 403 est le cas courant : la lecture exige `stock:read`. Le panneau le
      // dit, il ne vide pas la page.
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
        onDone: () => void this.refreshProduction(),
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

    // Une commande poussée par le serveur entre par le même chemin qu'un retour
    // d'appel : `upsert` ne peut donc pas produire deux états différents.
    this.realtime.messages$.pipe(takeUntilDestroyed()).subscribe((message) => {
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

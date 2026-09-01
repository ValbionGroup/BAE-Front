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
import { Subject, auditTime } from 'rxjs';
import {
  LucideArrowRight,
  LucideBadgePercent,
  LucideChevronDown,
  LucideChevronUp,
  LucideDynamicIcon,
  LucideEuro,
  LucideHandCoins,
  LucideQrCode,
  LucideScanLine,
  LucideSearch,
  LucideShoppingCart,
  LucideX,
  LucideCheck,
  LucideUser,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { CaisseStore } from '#core/store/caisse.store';
import { EventsStore } from '#core/store/events.store';
import { MenuItem } from '#core/models/event.model';
import { Btn, Badge, Kbd, formatCents } from '@bae/ui';
import { ModalService } from '#shared/components/modal/modal.service';
import { DiscountModal } from '#shared/components/modal/discount-modal/discount-modal';
import { SponsorshipPickerModal } from '#shared/components/modal/sponsorship-picker-modal/sponsorship-picker-modal';
import { Store } from '@ngrx/store';
import { selectPermissions } from '#core/store/auth/auth.selector';
import type { OrderDiscount } from '#core/services/orders/orders-service';
import { PaymentModal } from '#shared/components/modal/payment-modal/payment-modal';
import type { PaymentMethod } from '#core/models/order.model';
import { BuyerPicker } from '#shared/components/buyer-picker/buyer-picker';
import { CheckoutFeedback, type Pickup } from './checkout-feedback/checkout-feedback';
import type { Buyer, ScannedCategory } from '#core/services/buyers/buyers-service';
import type { SponsorshipCategory } from '#core/services/sponsorships/sponsorships-service';
import { WebsocketService } from '#core/services/websocket/websocket-service';
import { STOCK_AUDIT_MS } from '#shared/utils/stock-level';

@Component({
  selector: 'bfd-caisse',
  imports: [Btn, Badge, Kbd, LucideDynamicIcon, BuyerPicker, CheckoutFeedback],
  templateUrl: './caisse.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKey($event)' },
})
export class Caisse implements OnInit {
  protected readonly store = inject(CaisseStore);
  private readonly events = inject(EventsStore);
  private readonly pageHeader = inject(PageHeaderService);
  private readonly modalService = inject(ModalService);
  private readonly realtime = inject(WebsocketService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly permissions = inject(Store).selectSignal(selectPermissions);

  /** Sans le droit, le bouton n'est pas grisé : il n'existe pas. Un comptoir
   *  n'a pas à voir un geste qu'il ne peut pas faire. */
  protected readonly canDiscount = computed<boolean>(() =>
    this.permissions().includes('order:discount'),
  );

  /** Les ventes venues du fil, regroupées avant relecture — cf. `STOCK_AUDIT_MS`. */
  private readonly soldSomething = new Subject<void>();

  constructor() {
    effect(() => {
      const session = this.store.sessionEvent();

      this.pageHeader.set({
        title: 'Caisse',
        subtitle: session ? `${session.name} · Service en cours` : 'Aucune session en cours',
        breadcrumb: ['Soirée', 'Caisse'],
        activeNavId: 'cmd',
      });
    });

    /**
     * La caisse suit la soirée en cours, sans geste d'ouverture : demander de
     * « lancer la session » alors que la soirée tourne déjà était une formalité
     * vide, et la seule façon de se tromper de soirée.
     */
    effect(() => {
      const active = this.events.activeEvent();

      if (active === null) {
        if (this.store.sessionActive()) this.store.endSession();
        return;
      }

      if (this.store.sessionEventId() !== active.id) this.store.startSession(active.id);
    });

    /**
     * L'issue d'un paiement par carte arrive par le websocket de la soirée : le
     * terminal répond à SumUp, SumUp appelle le webhook, le serveur diffuse.
     * Aucun sondage n'est fait ici — la caisse attend d'être prévenue.
     */
    effect(() => {
      const eventId = this.store.sessionEventId();
      if (!eventId) return;
      untracked(() => void this.realtime.subscribeToEvent(eventId));
    });

    this.realtime.messages$.pipe(takeUntilDestroyed()).subscribe((message) => {
      // Une vente encaissée **ailleurs** — un second comptoir, la cuisine qui
      // annule — change ce qui reste à vendre ici. La caisse ne relisait le
      // stock qu'après ses propres encaissements : deux postes se croyaient
      // chacun seul, et `canAdd` laissait vendre un article déjà épuisé.
      if (message.type === 'order.created' || message.type === 'order.cancelled') {
        this.soldSomething.next();
        return;
      }

      if (message.type !== 'card_payment.updated') return;

      this.store.settleCardPayment(
        message.payload.orderRef,
        message.payload.status,
        message.payload.order,
      );
    });

    this.soldSomething
      .pipe(auditTime(STOCK_AUDIT_MS), takeUntilDestroyed())
      .subscribe(() => this.store.refreshStock());

    this.destroyRef.onDestroy(() => {
      const eventId = this.store.sessionEventId();
      if (eventId) void this.realtime.unsubscribeFromEvent(eventId);
    });
  }

  /**
   * `refresh()` et non `load()` : un écran de service doit relire l'état des
   * soirées à chaque entrée. `load()` sort sans rien faire une fois le
   * dictionnaire chargé, si bien qu'une soirée clôturée ailleurs restait « en
   * cours » ici jusqu'à un rechargement complet de la page.
   */
  ngOnInit(): void {
    void this.events.refresh();
  }

  /** « cotisation valide jusqu'au … » de la maquette, alimenté par le fast pass. */
  protected fastPassLabel(buyer: Buyer): string | null {
    if (!buyer.fastPass) return null;
    const until = new Date(buyer.fastPass.validUntil).toLocaleDateString('fr-FR');
    return `${buyer.fastPass.label} · valide jusqu'au ${until}`;
  }

  protected readonly pickingBuyer = signal(false);

  /** Feuille du ticket, sous `md` uniquement : repliée, elle laisse voir la grille. */
  protected readonly ticketOpen = signal(false);

  /** Depuis la barre repliée, ouvrir le tiroir en même temps que le sélecteur. */
  protected openBuyerPicker(): void {
    this.ticketOpen.set(true);
    this.pickingBuyer.set(true);
  }

  protected openDiscount(): void {
    this.modalService.open({
      type: 'component',
      component: DiscountModal,
      inputs: {
        // Le plafond, c'est ce qui reste dû : une remise déjà posée ne doit pas
        // rétrécir le maximum qu'on peut saisir en la remplaçant.
        maxCents: this.store.chargedTotal(),
        current: this.store.discount(),
        applied: (discount: OrderDiscount | null) =>
          discount ? this.store.setDiscount(discount) : this.store.clearDiscount(),
      },
    });
  }

  /**
   * Pose une prise en charge sans passer par le QR — le retardataire qui se
   * présente sans son exemplaire.
   */
  protected openCategoryPicker(): void {
    const eventId = this.store.sessionEventId();
    if (!eventId) return;

    this.modalService.open({
      type: 'component',
      component: SponsorshipPickerModal,
      inputs: {
        eventId,
        currentId: this.store.category()?.id ?? null,
        picked: (category: SponsorshipCategory | null) =>
          category ? this.applyCategory(category) : this.store.clearCategory(),
      },
    });
  }

  /** Le payeur n'est pas porté par la tranche mais par la soirée : le scan le
   *  dénormalise, la sélection manuelle doit le relire elle-même. */
  private applyCategory(category: SponsorshipCategory): void {
    this.store.applyCategory({
      ...category,
      payerName: this.store.sessionEvent()?.payerName ?? null,
    });
  }

  /** Retrait de précommande lu au scanner, affiché comme une confirmation. */
  protected readonly pickup = signal<Pickup | null>(null);

  protected onPickedUp(scan: Pickup): void {
    this.pickup.set(scan);
    this.pickingBuyer.set(false);
  }

  protected dismissFeedback(): void {
    this.pickup.set(null);
    this.store.dismissFeedback();
  }

  protected onBuyerPicked(buyer: Buyer): void {
    this.store.setBuyer(buyer);
    this.pickingBuyer.set(false);
  }

  protected onCategoryPicked(category: ScannedCategory): void {
    if (!this.store.applyCategory(category)) return;
    this.pickingBuyer.set(false);
  }

  /** Le choix du moyen de paiement précède l'encaissement, il ne le suit pas. */
  protected openPayment(): void {
    if (this.store.itemCount() === 0) return;

    if (this.store.chargedTotal() === 0) {
      void this.checkout('cash');
      return;
    }

    this.modalService.open({
      type: 'component',
      component: PaymentModal,
      inputs: {
        totalCents: this.store.netTotal(),
        clientName: this.store.selectedBuyer()?.name ?? 'Anonyme',
        onConfirm: (method: PaymentMethod) => this.checkout(method),
      },
    });
  }

  /** Le bandeau de confirmation porte le retour : pas de toast en doublon. */
  private async checkout(method: PaymentMethod): Promise<void> {
    await this.store.checkout(method);
  }

  protected onCategoryClick(category: string): void {
    const current = this.store.activeCategory();
    this.store.setActiveCategory(current === category ? null : category);
  }

  protected addItem(item: MenuItem): void {
    this.store.addToCart(item);
  }

  /** Les raccourcis annoncés en pied de page. */
  protected onKey(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (this.modalService.modals().length > 0 || this.pickingBuyer()) return;
    if (!this.store.sessionActive()) return;

    const target = event.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
      return;
    }

    switch (event.key) {
      case 'F1':
        event.preventDefault();
        this.store.nextCategory();
        return;

      case '+':
      case '=':
        event.preventDefault();
        this.adjustActive(1);
        return;

      case '-':
        event.preventDefault();
        this.adjustActive(-1);
        return;

      case 'Enter':
        if (tag === 'BUTTON' || tag === 'A') return;
        event.preventDefault();
        this.openPayment();
        return;

      default:
        return;
    }
  }

  private adjustActive(delta: number): void {
    const line = this.store.activeLine();
    if (!line) return;
    if (delta > 0) this.store.incrementItem(line.productId);
    else this.store.decrementItem(line.productId);
  }

  /** Le stock est bas mais pas épuisé — la carte porte alors le compte restant. */
  protected isLow(productId: number): boolean {
    return this.store.stockByProduct().get(productId)?.level === 'low';
  }

  protected soldOutHint(productId: number): string | null {
    if (this.store.canAdd(productId)) return null;
    return this.store.remainingFor(productId) === 0 &&
      this.store.stockByProduct().get(productId)?.remainingQty !== 0
      ? 'Tout le restant est déjà dans le panier.'
      : 'Plus rien à vendre : relancez une production depuis la vue live.';
  }

  protected readonly formatCents = formatCents;

  protected readonly icScan = LucideScanLine;
  protected readonly icHand = LucideHandCoins;
  protected readonly icSearch = LucideSearch;
  protected readonly icCart = LucideShoppingCart;
  protected readonly icChevronUp = LucideChevronUp;
  protected readonly icChevronDown = LucideChevronDown;
  protected readonly icX = LucideX;
  protected readonly icCheck = LucideCheck;
  protected readonly icUser = LucideUser;
  protected readonly icEuro = LucideEuro;
  protected readonly icQr = LucideQrCode;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icPercent = LucideBadgePercent;
}

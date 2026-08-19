import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal } from '@angular/core';
import {
  LucideArrowRight,
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
import {
  PaymentModal,
  type PaymentMethod,
} from '#shared/components/modal/payment-modal/payment-modal';
import { BuyerPicker } from '#shared/components/buyer-picker/buyer-picker';
import { CheckoutFeedback, type Pickup } from './checkout-feedback/checkout-feedback';
import type { Buyer, ScannedCategory } from '#core/services/buyers/buyers-service';

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
     *
     * ⚠️ Ici et non dans le store : `startSession()` déclenche deux chargements
     * HTTP, qu'on ne veut pas voir partir depuis les autres pages — le store est
     * `providedIn: 'root'`.
     *
     * La fermeture compte autant que l'ouverture : une soirée clôturée sort
     * d'`activeEvent`, et la caisse ne doit pas continuer d'encaisser dessus.
     */
    effect(() => {
      const active = this.events.activeEvent();

      if (active === null) {
        if (this.store.sessionActive()) this.store.endSession();
        return;
      }

      if (this.store.sessionEventId() !== active.id) this.store.startSession(active.id);
    });
  }

  ngOnInit(): void {
    void this.events.load();
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
    // Le refus passe par le grand bandeau, pas par un toast : en plein rush, il
    // doit se voir sans être cherché.
    if (!this.store.applyCategory(category)) return;
    this.pickingBuyer.set(false);
  }

  /** Le choix du moyen de paiement précède l'encaissement, il ne le suit pas. */
  protected openPayment(): void {
    if (this.store.itemCount() === 0) return;

    // Une commande entièrement prise en charge ne fait entrer aucun argent :
    // demander « espèces ou Lydia ? » pour zéro euro est un geste de plus qui
    // n'arbitre rien. La commande part quand même — c'est elle qui porte la
    // créance du payeur.
    if (this.store.chargedTotal() === 0) {
      void this.checkout('cash');
      return;
    }

    this.modalService.open({
      type: 'component',
      component: PaymentModal,
      inputs: {
        totalCents: this.store.chargedTotal(),
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

  /**
   * Les raccourcis annoncés en pied de page.
   *
   * ⚠️ Ils sont posés sur `document`, donc ils entendent tout. Ce que la garde
   * écarte : la frappe dans un champ (la recherche d'acheteur), une modale
   * ouverte (le paiement a ses propres touches), et `Entrée` sur un bouton
   * déjà ciblé — sans quoi la validation native et ce gestionnaire ouvriraient
   * deux modales de paiement.
   */
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
      case '=': // même touche sans majuscule sur un clavier français
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

  /**
   * ⚠️ Un bouton désactivé n'explique rien de lui-même, et au comptoir on
   * cliquera dessus plusieurs fois avant de comprendre. L'infobulle distingue
   * les deux causes : plus rien n'a été produit, ou le panier détient déjà tout
   * ce qui restait.
   */
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
}

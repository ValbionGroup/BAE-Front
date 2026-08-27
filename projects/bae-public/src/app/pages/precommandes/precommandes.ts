import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  LucideArrowRight,
  LucideClock,
  LucideDynamicIcon,
  LucideMinus,
  LucidePlus,
  LucideQrCode,
  LucideShield,
} from '@lucide/angular';
import {
  Badge,
  Btn,
  Card,
  ExternalNavigation,
  Skeleton,
  buildPickupSlots,
  formatCents,
  messageOf,
  type PickupSlot,
} from '@bae/ui';

import { CatalogStore } from '../../core/catalog.store';
import { PaymentsService } from '../../core/payments.service';
import { PurchasesStore } from '../../core/purchases.store';
import { SessionStore } from '../../core/session.store';
import type { PublicEvent, PublicMenuLine } from '../../core/catalog.models';

interface MenuSection {
  readonly category: string;
  readonly items: readonly PublicMenuLine[];
}

interface CartLine {
  readonly item: PublicMenuLine;
  readonly qty: number;
}

@Component({
  selector: 'bfp-precommandes',
  imports: [RouterLink, Btn, Badge, Card, Skeleton, LucideDynamicIcon],
  templateUrl: './precommandes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Precommandes {
  protected readonly store = inject(CatalogStore);
  private readonly payments = inject(PaymentsService);
  private readonly navigation = inject(ExternalNavigation);
  private readonly session = inject(SessionStore);
  private readonly purchases = inject(PurchasesStore);

  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icShield = LucideShield;
  protected readonly icQr = LucideQrCode;
  protected readonly icClock = LucideClock;
  protected readonly icPlus = LucidePlus;
  protected readonly icMinus = LucideMinus;

  private readonly picked = signal<number | null>(null);

  /** Créneau de retrait choisi, `null` tant que le client n'en a pas voulu. */
  protected readonly pickupSlot = signal<string | null>(null);

  protected readonly selected = computed<PublicEvent | null>(() => {
    const id = this.picked();
    if (id === null) return this.store.featured();
    return this.store.events().find((event) => event.id === id) ?? this.store.featured();
  });

  constructor() {
    this.store.loadEvents();
    // Le catalogue des formules pour son seul `bonusPercent` : c'est le seul
    // endroit public où le serveur publie le supplément adhérent.
    this.store.loadFastPasses();

    // Sans cotisation connue, le panier annoncerait 10 % à quelqu'un que Lydia
    // débitera de 15 %. La garde d'`init` du magasin rend l'appel gratuit quand
    // l'en-tête l'a déjà fait.
    effect(() => {
      if (this.session.isAuthenticated()) this.purchases.loadSubscriptions();
    });

    effect(() => {
      const event = this.selected();
      if (event !== null) this.store.loadMenu(event.id);
      // Un créneau appartient à une soirée : le garder en changeant de soirée
      // enverrait une heure que la nouvelle ne propose pas.
      this.pickupSlot.set(null);
    });
  }

  protected readonly sections = computed<readonly MenuSection[]>(() => {
    const grouped = new Map<string, PublicMenuLine[]>();

    for (const line of this.store.menu()?.lines ?? []) {
      const key = line.category ?? 'Autres';
      const bucket = grouped.get(key);
      if (bucket === undefined) grouped.set(key, [line]);
      else bucket.push(line);
    }

    return [...grouped].map(([category, items]) => ({ category, items }));
  });

  /**
   * Les créneaux de retrait proposés, partagés avec l'écran d'administration :
   * ce que le client choisit ici, le staff doit pouvoir le déplacer là-bas.
   *
   * Le back refuse de toute façon un créneau hors soirée ou mal aligné — cette
   * liste ne fait que proposer.
   */
  protected readonly pickupSlots = computed<readonly PickupSlot[]>(() => {
    const event = this.selected();
    if (event === null) return [];
    return buildPickupSlots(event.startsAt, event.endsAt);
  });

  protected readonly itemCount = computed(() => this.store.menu()?.lines.length ?? 0);

  /** La remise consentie à tout le monde, telle que le menu public l'annonce. */
  protected readonly basePercent = computed(() => this.store.menu()?.discountPercent ?? 0);

  protected readonly hasFastPass = computed(() => this.purchases.activeSubscription() !== null);

  /**
   * Le supplément adhérent, nul tant qu'aucune cotisation en cours n'est connue.
   *
   * ⚠️ Reproduit la règle de `quotePreOrder` côté serveur : le bonus s'**ajoute**
   * à la remise de base pour qui a un FastPass valide. C'est bien le serveur qui
   * arrête le montant — ce calcul ne fait qu'annoncer le sien à l'avance, et un
   * panier qui l'oublierait afficherait un total que Lydia ne demanderait pas.
   */
  protected readonly memberPercent = computed(() =>
    this.hasFastPass() ? this.store.bonusPercent() : 0,
  );

  protected readonly discountPercent = computed(() => this.basePercent() + this.memberPercent());
  protected readonly closeLeadHours = computed(() => this.store.menu()?.closeLeadHours ?? 0);
  private readonly quantities = signal<ReadonlyMap<number, number>>(new Map());

  private readonly resetOnEventChange = effect(() => {
    void this.selected()?.id;
    this.quantities.set(new Map());
  });

  private readonly itemsById = computed(
    () => new Map((this.store.menu()?.lines ?? []).map((line) => [line.productId, line])),
  );

  protected readonly cartLines = computed<readonly CartLine[]>(() => {
    const items = this.itemsById();
    return [...this.quantities().entries()]
      .map(([productId, qty]) => ({ item: items.get(productId), qty }))
      .filter((line): line is CartLine => line.item !== undefined);
  });

  protected readonly subtotal = computed(() =>
    this.cartLines().reduce((total, line) => total + line.item.price * line.qty, 0),
  );

  protected readonly discount = computed(() =>
    Math.round((this.subtotal() * this.discountPercent()) / 100),
  );

  protected readonly baseDiscount = computed(() =>
    Math.round((this.subtotal() * this.basePercent()) / 100),
  );

  /**
   * Le reste, et non un second arrondi : `applyDiscount` n'arrondit qu'une fois,
   * sur le pourcentage cumulé. Deux arrondis séparés ne feraient pas toujours la
   * somme, et le panier afficherait deux lignes qui ne tombent pas sur le total.
   */
  protected readonly memberDiscount = computed(() => this.discount() - this.baseDiscount());

  protected readonly total = computed(() => this.subtotal() - this.discount());

  protected readonly isEmpty = computed(() => this.cartLines().length === 0);

  protected readonly submitting = signal(false);
  protected readonly checkoutError = signal<string | null>(null);

  /**
   * Le menu reste consultable déconnecté ; seule la validation exige un compte.
   *
   * ⚠️ Testé contre `anonymous`, jamais contre « pas authentifié » : tant que
   * `/account/profile` n'a pas répondu, l'état est `unknown`, et afficher
   * « connectez-vous » à ce moment le dirait à quelqu'un qui l'est déjà. Dans
   * cet intervalle le bouton reste simplement inactif.
   */
  protected readonly needsLogin = computed(() => this.session.status() === 'anonymous');

  protected readonly canCheckout = computed(
    () => !this.isEmpty() && !this.submitting() && this.session.isAuthenticated(),
  );

  protected checkout(): void {
    const event = this.selected();
    if (event === null || !this.canCheckout()) return;

    this.submitting.set(true);
    this.checkoutError.set(null);

    this.payments
      .openPreOrder(
        event.id,
        this.cartLines().map((line) => ({
          productId: line.item.productId,
          quantity: line.qty,
        })),
        this.pickupSlot(),
      )
      .subscribe({
        next: (payment) => {
          // Le total affiché n'a aucune autorité : le serveur a recalculé le
          // prix, et c'est le sien que la page Lydia présentera.
          if (payment.mobileUrl === null) this.fail();
          else this.navigation.go(payment.mobileUrl);
        },
        error: (error: unknown) => this.fail(error),
      });
  }

  /**
   * Sans argument, le repli : c'est le cas d'une réponse sans lien Lydia, où
   * réessayer est effectivement le bon conseil. Avec une erreur, le message de
   * l'API l'emporte — un refus comme « vous avez déjà une précommande » ne
   * cédera à aucun nombre de tentatives, et le conseil générique enverrait le
   * client tourner en rond.
   */
  private fail(error?: unknown): void {
    this.submitting.set(false);
    this.checkoutError.set(
      messageOf(error, 'Le paiement n’a pas pu être ouvert. Réessayez dans un instant.'),
    );
  }

  protected chooseSlot(value: string): void {
    this.pickupSlot.set(value === '' ? null : value);
  }

  protected pick(eventId: number): void {
    this.picked.set(eventId);
    this.scrollToMenu();
  }

  protected qtyOf(productId: number): number {
    return this.quantities().get(productId) ?? 0;
  }

  protected increment(productId: number): void {
    this.quantities.update((current) => {
      const next = new Map(current);
      next.set(productId, (next.get(productId) ?? 0) + 1);
      return next;
    });
  }

  protected decrement(productId: number): void {
    this.quantities.update((current) => {
      const next = new Map(current);
      const qty = (next.get(productId) ?? 0) - 1;
      if (qty <= 0) next.delete(productId);
      else next.set(productId, qty);
      return next;
    });
  }

  protected price(cents: number): string {
    return formatCents(cents);
  }

  protected lineTotal(line: CartLine): number {
    return line.item.price * line.qty;
  }

  protected dayOf(event: PublicEvent): string {
    return format(new Date(event.startsAt), 'dd', { locale: fr });
  }

  protected monthOf(event: PublicEvent): string {
    return format(new Date(event.startsAt), 'LLL', { locale: fr }).replace('.', '').toUpperCase();
  }

  protected longDateOf(event: PublicEvent): string {
    return format(new Date(event.startsAt), 'EEEE d MMMM · HH:mm', { locale: fr }).toUpperCase();
  }

  protected closingOf(event: PublicEvent): string {
    return format(new Date(event.preOrdersCloseAt), 'dd/MM · HH:mm', { locale: fr });
  }

  protected availabilityPct(event: PublicEvent): number {
    return event.capacity > 0 ? (event.remaining / event.capacity) * 100 : 0;
  }

  protected scrollToMenu(): void {
    const menu = document.getElementById('menu');
    if (menu === null) return;

    menu.scrollIntoView({ behavior: 'smooth', block: 'start' });
    menu.focus({ preventScroll: true });
  }
}

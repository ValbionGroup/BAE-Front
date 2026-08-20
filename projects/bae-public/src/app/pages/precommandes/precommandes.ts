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
import { Badge, Btn, Card, ExternalNavigation, Skeleton, formatCents } from '@bae/ui';

import { CatalogStore } from '../../core/catalog.store';
import { PaymentsService } from '../../core/payments.service';
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

  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icShield = LucideShield;
  protected readonly icQr = LucideQrCode;
  protected readonly icClock = LucideClock;
  protected readonly icPlus = LucidePlus;
  protected readonly icMinus = LucideMinus;

  private readonly picked = signal<number | null>(null);

  protected readonly selected = computed<PublicEvent | null>(() => {
    const id = this.picked();
    if (id === null) return this.store.featured();
    return this.store.events().find((event) => event.id === id) ?? this.store.featured();
  });

  constructor() {
    this.store.loadEvents();

    effect(() => {
      const event = this.selected();
      if (event !== null) this.store.loadMenu(event.id);
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

  protected readonly itemCount = computed(() => this.store.menu()?.lines.length ?? 0);
  protected readonly discountPercent = computed(() => this.store.menu()?.discountPercent ?? 0);
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
      )
      .subscribe({
        next: (payment) => {
          // Le total affiché n'a aucune autorité : le serveur a recalculé le
          // prix, et c'est le sien que la page Lydia présentera.
          if (payment.mobileUrl === null) this.fail();
          else this.navigation.go(payment.mobileUrl);
        },
        error: () => this.fail(),
      });
  }

  private fail(): void {
    this.submitting.set(false);
    this.checkoutError.set('Le paiement n’a pas pu être ouvert. Réessayez dans un instant.');
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

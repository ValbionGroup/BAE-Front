import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { LucidePackagePlus } from '@lucide/angular';
import { Btn, Field, Input, messageOf } from '@bae/ui';
import { StocksStore } from '#core/store/stocks.store';
import { filterProducts, parseQuantity } from '#pages/authed/stocks/stocks.helpers';
import type { StockProduct } from '#pages/authed/stocks/stocks.types';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/** Au-delà, la liste cesse d'aider : c'est la recherche qui prend le relais. */
const MAX_RESULTS = 40;

/**
 * Entrée de stock **sans code-barres** : on choisit la denrée, on dit combien et
 * jusqu'à quand.
 *
 * Elle existe parce que le scanner était l'unique porte d'entrée du stock, et
 * qu'il ne sait rien faire d'un sac de farine en vrac, d'un fût ou d'un don —
 * rien de tout cela ne porte d'EAN.
 *
 * ⚠️ Un lot, pas un mouvement : c'est le lot qui porte la DLC et l'étiquette,
 * donc l'ordre FEFO. Un `stock_movement` de type `in` gonflerait un lot existant
 * sans dire d'où vient la quantité.
 */
@Component({
  selector: 'bfd-stock-entry-modal',
  imports: [Btn, Field, Input, ModalShell],
  templateUrl: './stock-entry-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockEntryModal {
  readonly id = input.required<string>();
  /** Denrée déjà désignée par l'appelant ; `null` = à chercher ici. */
  readonly goodId = input<number | null>(null);
  readonly onDone = input<() => void>(() => {});

  private readonly modalService = inject(ModalService);
  private readonly store = inject(StocksStore);

  protected readonly icEntry = LucidePackagePlus;

  protected readonly query = signal('');
  protected readonly picked = signal<StockProduct | null>(null);
  protected readonly quantity = signal('');
  protected readonly expiration = signal('');
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // La modale s'ouvre aussi depuis un écran qui n'a pas le catalogue en
    // mémoire ; `load()` sort aussitôt s'il y est déjà.
    void this.store.load();

    // La denrée désignée n'est connue qu'une fois le catalogue chargé — d'où un
    // effect plutôt qu'une lecture dans le constructeur.
    effect(() => {
      const id = this.goodId();
      if (id === null || this.picked() !== null) return;
      const found = this.store.products().find((product) => product.id === id);
      if (found) this.picked.set(found);
    });
  }

  protected readonly results = computed(() =>
    filterProducts(this.store.products(), this.query(), MAX_RESULTS),
  );

  protected readonly truncated = computed(() => this.results().length === MAX_RESULTS);

  /** L'appelant a désigné la denrée : on ne redemande pas laquelle. */
  protected readonly locked = computed(() => this.goodId() !== null);

  protected readonly qty = computed(() => parseQuantity(this.quantity()));

  protected readonly valid = computed(() => this.picked() !== null && this.qty() !== null);

  protected onQuery(value: string): void {
    this.query.set(value);
  }

  protected onQuantity(value: string): void {
    this.quantity.set(value);
  }

  protected onExpiration(value: string): void {
    this.expiration.set(value);
  }

  protected choose(product: StockProduct): void {
    this.picked.set(product);
    this.query.set('');
  }

  /** Revenir à la recherche : la denrée choisie n'est pas un cul-de-sac. */
  protected clearPick(): void {
    if (this.locked()) return;
    this.picked.set(null);
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    const product = this.picked();
    const quantity = this.qty();
    if (product === null || quantity === null || this.busy()) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await this.store.createBatch({
        goodId: product.id,
        quantity,
        // Tout ne périme pas : une DLC vide part à `null`, pas en chaîne vide.
        expirationDate: this.expiration() === '' ? null : this.expiration(),
      });
      if (!result.ok) {
        this.error.set(messageOf(result.error, "Ce lot n'a pas pu être entré en stock."));
        return;
      }
      this.onDone()();
      this.modalService.close(this.id());
    } finally {
      this.busy.set(false);
    }
  }

  protected cancel(): void {
    this.modalService.close(this.id());
  }
}

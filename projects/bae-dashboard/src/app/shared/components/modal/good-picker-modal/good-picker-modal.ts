import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucideScanLine } from '@lucide/angular';
import { Btn, Field, Input } from '@bae/ui';
import { StocksStore } from '#core/store/stocks.store';
import type { StockProduct } from '#pages/authed/stocks/stocks.types';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/** Au-delà, la liste cesse d'aider : c'est la recherche qui prend le relais. */
const MAX_RESULTS = 40;

/**
 * Rattache un code inconnu à une denrée **déjà** au catalogue.
 *
 * Sans cet écran, le scanner n'offrait qu'une issue au code inconnu — créer une
 * denrée — et un second conditionnement du même aliment fabriquait un doublon.
 *
 * ⚠️ N'écrit rien : le choix remonte à l'appelant, qui ne le persiste qu'à la
 * validation de son lot. Quitter le scanner ne doit laisser aucune trace.
 */
@Component({
  selector: 'bfd-good-picker-modal',
  imports: [Btn, Field, Input, ModalShell],
  templateUrl: './good-picker-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoodPickerModal {
  readonly id = input.required<string>();
  /** Le code lu, affiché en en-tête pour qu'on sache à quoi on le rattache. */
  readonly barcode = input.required<string>();
  readonly picked = input<((product: StockProduct) => void) | null>(null);
  /** Ouvre la création à la place — même geste, autre issue. */
  readonly createInstead = input<(() => void) | null>(null);

  private readonly modalService = inject(ModalService);
  protected readonly store = inject(StocksStore);

  protected readonly icScan = LucideScanLine;
  protected readonly query = signal('');

  protected onQuery(value: string): void {
    this.query.set(value);
  }

  protected readonly results = computed(() => {
    const needle = this.query().trim().toLowerCase();
    const products = this.store.products();
    const matching =
      needle === ''
        ? products
        : products.filter(
            (product) =>
              product.name.toLowerCase().includes(needle) ||
              product.brand?.toLowerCase().includes(needle) ||
              product.categoryName.toLowerCase().includes(needle),
          );
    return matching.slice(0, MAX_RESULTS);
  });

  protected readonly truncated = computed(() => this.results().length === MAX_RESULTS);

  protected choose(product: StockProduct): void {
    this.picked()?.(product);
    this.modalService.close(this.id());
  }

  protected create(): void {
    this.modalService.close(this.id());
    this.createInstead()?.();
  }

  protected cancel(): void {
    this.modalService.close(this.id());
  }
}

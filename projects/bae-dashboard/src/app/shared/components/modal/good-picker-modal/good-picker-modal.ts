import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucidePackageSearch, LucideScanLine } from '@lucide/angular';
import { Btn, Field, Input } from '@bae/ui';
import { StocksStore } from '#core/store/stocks.store';
import { filterProducts } from '#pages/authed/stocks/stocks.helpers';
import type { StockProduct } from '#pages/authed/stocks/stocks.types';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/** Au-delà, la liste cesse d'aider : c'est la recherche qui prend le relais. */
const MAX_RESULTS = 40;

/**
 * Choisit une denrée **déjà** au catalogue.
 *
 * Deux usages, d'où le `barcode` optionnel : rattacher un code inconnu — sans
 * cet écran, le scanner n'offrait qu'une issue au code inconnu, créer une
 * denrée, et un second conditionnement du même aliment fabriquait un doublon —
 * et, `barcode` à `null`, désigner à la main une denrée qui n'a pas de code du
 * tout.
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
  /** Le code lu, affiché en en-tête pour qu'on sache à quoi on le rattache.
   *  `null` quand la denrée se désigne à la main, sans code. */
  readonly barcode = input<string | null>(null);
  readonly picked = input<((product: StockProduct) => void) | null>(null);
  /** Ouvre la création à la place — même geste, autre issue. */
  readonly createInstead = input<(() => void) | null>(null);

  private readonly modalService = inject(ModalService);
  protected readonly store = inject(StocksStore);

  protected readonly icScan = LucideScanLine;
  protected readonly icSearch = LucidePackageSearch;
  protected readonly query = signal('');

  protected readonly attaching = computed(() => this.barcode() !== null);

  protected onQuery(value: string): void {
    this.query.set(value);
  }

  protected readonly results = computed(() =>
    filterProducts(this.store.products(), this.query(), MAX_RESULTS),
  );

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

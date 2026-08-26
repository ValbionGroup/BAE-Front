import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucidePackageMinus } from '@lucide/angular';
import { Btn, Field, Input, messageOf } from '@bae/ui';
import { StocksStore } from '#core/store/stocks.store';
import { parseQuantity } from '#pages/authed/stocks/stocks.helpers';
import type { StockBatchRow } from '#pages/authed/stocks/stocks.types';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Sortie **partielle** d'un lot.
 *
 * Le rebut existait déjà, mais il sort tout le restant d'un lot périmé : rien ne
 * permettait de dire « on en a pris quatre ». Un stock qu'on ne peut décrémenter
 * qu'en entier n'est pas tenu, il est deviné.
 *
 * ⚠️ Sur **un lot**, pas sur la denrée : c'est le lot qui porte la DLC, donc
 * l'ordre FEFO. Sortir « de la moutarde » sans dire de quel pot ferait vieillir
 * le mauvais.
 */
@Component({
  selector: 'bfd-stock-exit-modal',
  imports: [Btn, Field, Input, ModalShell],
  templateUrl: './stock-exit-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockExitModal {
  readonly id = input.required<string>();
  readonly goodId = input.required<number>();
  readonly goodName = input<string>('');
  readonly unit = input<string>('');
  readonly batch = input.required<StockBatchRow>();
  readonly onDone = input<() => void>(() => {});

  private readonly modalService = inject(ModalService);
  private readonly store = inject(StocksStore);

  protected readonly icExit = LucidePackageMinus;

  protected readonly quantity = signal('');
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly qty = computed(() => parseQuantity(this.quantity()));

  /**
   * L'API refuse déjà en `E_STOCK_INSUFFICIENT` — la borne ici n'est pas une
   * garantie, c'est ce qui évite un aller-retour pour dire ce que l'écran sait.
   */
  protected readonly tooMuch = computed(() => {
    const value = this.qty();
    return value !== null && value > this.batch().remainingQty;
  });

  protected readonly valid = computed(() => this.qty() !== null && !this.tooMuch());

  protected onQuantity(value: string): void {
    this.quantity.set(value);
  }

  /** Le geste courant : vider ce qui reste. */
  protected takeAll(): void {
    this.quantity.set(String(this.batch().remainingQty));
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    const quantity = this.qty();
    if (quantity === null || this.tooMuch() || this.busy()) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await this.store.removeFromBatch({
        goodId: this.goodId(),
        stockBatchId: this.batch().id,
        quantity,
      });
      if (!result.ok) {
        // Un autre poste a pu servir entre l'ouverture et la validation : le
        // message du serveur dit le restant réel, le nôtre dirait l'ancien.
        this.error.set(messageOf(result.error, "Cette sortie n'a pas pu être enregistrée."));
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

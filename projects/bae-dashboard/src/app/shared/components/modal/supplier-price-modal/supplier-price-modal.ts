import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucideEuro } from '@lucide/angular';
import { Btn, Field, Input, formatCents, messageOf, parseEuros } from '@bae/ui';
import { StocksStore } from '#core/store/stocks.store';
import type { ApiSupplierPrice } from '#core/services/stocks/stocks-service';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Saisie du tarif d'une denrée chez une enseigne.
 *
 * ⚠️ **Le prix est celui de l'unité de stock**, et l'écran le dit
 * (« Prix par kg »). Rien ne normalise les conditionnements : `pricing_service`
 * compare les prix bruts entre enseignes, donc un prix au sac de 5 kg face à un
 * prix au kilo fausserait la comparaison **et** le prix de référence servi au
 * coût de recette, à la liste de courses et au bilan.
 *
 * L'utilisateur saisit des euros ; `parseEuros` convertit en centimes, seule
 * frontière de conversion du front.
 */
@Component({
  selector: 'bfd-supplier-price-modal',
  imports: [Btn, Field, Input, ModalShell],
  templateUrl: './supplier-price-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierPriceModal {
  readonly id = input.required<string>();
  readonly goodId = input.required<number>();
  readonly goodName = input<string>('');
  /** « Prix par kg », construit par l'appelant depuis `goods.unit`. */
  readonly unitLabel = input<string>('Prix');
  /** `null` = nouvelle enseigne à choisir ; sinon on corrige celle-ci. */
  readonly supplierId = input<number | null>(null);
  readonly current = input<ApiSupplierPrice | null>(null);
  /** Enseignes déjà tarifées : exclues du sélecteur pour éviter un doublon. */
  readonly taken = input<readonly number[]>([]);
  readonly onDone = input<() => void>(() => {});

  private readonly modalService = inject(ModalService);
  private readonly store = inject(StocksStore);

  protected readonly icEuro = LucideEuro;

  protected readonly suppliers = signal<readonly { id: number; name: string }[]>([]);
  protected readonly chosen = signal<string>('');
  protected readonly amount = signal<string>('');
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly editing = computed(() => this.supplierId() !== null);

  protected readonly title = computed(() =>
    this.editing() ? 'Modifier le tarif' : 'Ajouter un tarif',
  );

  constructor() {
    queueMicrotask(() => {
      const price = this.current();
      if (price) this.amount.set(formatCents(price.price));
      const id = this.supplierId();
      if (id !== null) this.chosen.set(String(id));
      if (id === null) void this.loadSuppliers();
    });
  }

  private async loadSuppliers(): Promise<void> {
    const all = await this.store.listSuppliers();
    const taken = new Set(this.taken());
    this.suppliers.set(all.filter((supplier) => !taken.has(supplier.id)));
  }

  protected onChosen(value: string): void {
    this.chosen.set(value);
  }
  protected onAmount(value: string): void {
    this.amount.set(value);
  }

  /** `parseEuros` rend `null` sur une saisie illisible — un prix vide n'est pas zéro. */
  protected readonly cents = computed<number | null>(() => {
    const raw = this.amount().trim();
    if (raw === '') return null;
    const parsed = parseEuros(raw);
    return parsed === null || parsed < 0 ? null : parsed;
  });

  protected readonly valid = computed(() => this.chosen() !== '' && this.cents() !== null);

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    const cents = this.cents();
    if (!this.valid() || cents === null || this.busy()) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await this.store.setSupplierPrice(this.goodId(), Number(this.chosen()), cents);
      if (!result.ok) {
        this.error.set(messageOf(result.error, "Le tarif n'a pas pu être enregistré."));
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

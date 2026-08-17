import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucidePackage } from '@lucide/angular';
import { Btn, Field, Input, ToastService } from '@bae/ui';
import { StocksStore } from '#core/store/stocks.store';
import { GOOD_UNITS, GOOD_UNIT_LABELS, type GoodUnit } from '#core/services/stocks/stocks-service';
import type { StockProduct } from '#pages/authed/stocks/stocks.types';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Saisie d'un produit du catalogue.
 *
 * Le produit naît sans lot, donc à zéro : créer une référence et en avoir en
 * stock sont deux gestes distincts. Le sous-titre le dit, sans quoi la ligne à
 * 0 passerait pour un bug.
 */
@Component({
  selector: 'bfd-good-create-modal',
  imports: [Btn, Field, Input, ModalShell],
  templateUrl: './good-create-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoodCreateModal {
  readonly id = input.required<string>();
  /** Code lu au scanner, quand la modale est ouverte depuis un produit inconnu. */
  readonly barcode = input<string | null>(null);
  /** Prévient l'appelant du produit créé — le scanner s'en sert pour rattacher
   *  la ligne qui l'a demandé. */
  readonly created = input<((product: StockProduct) => void) | null>(null);

  protected readonly units = GOOD_UNITS.map((unit) => ({
    value: unit,
    label: GOOD_UNIT_LABELS[unit],
  }));

  private readonly modalService = inject(ModalService);
  private readonly toast = inject(ToastService);
  protected readonly store = inject(StocksStore);

  protected readonly icPackage = LucidePackage;

  protected readonly name = signal<string>('');
  protected readonly unit = signal<string>('');
  protected readonly brand = signal<string>('');
  protected readonly categoryId = signal<string>('');

  /** Les erreurs de champ ne s'affichent qu'après une tentative d'envoi. */
  protected readonly submitted = signal(false);

  protected onName(v: string): void {
    this.name.set(v);
  }
  protected onUnit(v: string): void {
    this.unit.set(v);
  }
  protected onBrand(v: string): void {
    this.brand.set(v);
  }
  protected onCategoryId(v: string): void {
    this.categoryId.set(v);
  }

  protected readonly valid = computed(
    () => this.name().trim() !== '' && this.unit().trim() !== '' && this.categoryId() !== '',
  );

  /** Sans catégorie chargée, le formulaire ne peut rien produire de valide. */
  protected readonly categoriesMissing = computed(() => this.store.categories().length === 0);

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (!this.valid()) return;

    const product = await this.store.createGood({
      name: this.name().trim(),
      unit: this.unit() as GoodUnit,
      // `''` et non `null` : la colonne est `NOT NULL` côté base.
      brand: this.brand().trim(),
      categoryId: Number(this.categoryId()),
      barcode: this.barcode(),
    });

    if (!product) return;
    this.created()?.(product);
    this.toast.show({
      type: 'success',
      title: 'Produit créé',
      message: `${product.name} est au catalogue, sans stock pour l'instant.`,
    });
    this.modalService.close(this.id());
  }

  protected cancel(): void {
    this.modalService.close(this.id());
  }
}

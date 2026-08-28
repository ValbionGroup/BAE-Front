import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucidePackage } from '@lucide/angular';
import { Btn, Field, Input, ToastService } from '@bae/ui';
import { StocksStore } from '#core/store/stocks.store';
import { GOOD_UNITS, GOOD_UNIT_LABELS, type GoodUnit } from '#core/services/stocks/stocks-service';
import type { StockProduct } from '#pages/authed/stocks/stocks.types';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Saisie d'un produit du catalogue, à la création comme à la modification.
 *
 * À la création, le produit naît sans lot, donc à zéro : créer une référence et
 * en avoir en stock sont deux gestes distincts. Le sous-titre le dit, sans quoi
 * la ligne à 0 passerait pour un bug.
 *
 * ⚠️ **L'unité ne s'édite pas.** Elle reste affichée, en lecture seule : passer
 * une denrée de `kg` à `pcs` ne convertit rien, et rendrait faux d'un coup les
 * quantités de tous ses lots et tous ses tarifs d'enseigne. `UpdateGoodPayload`
 * ne porte donc pas la clé, et le contrôleur n'affecte que celles qu'il reçoit.
 */
@Component({
  selector: 'bfd-good-edit-modal',
  imports: [Btn, Field, Input, ModalShell],
  templateUrl: './good-edit-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoodEditModal {
  readonly id = input.required<string>();
  /** Code lu au scanner, quand la modale est ouverte depuis un produit inconnu. */
  readonly barcode = input<string | null>(null);
  /** `null` en création ; la denrée à corriger sinon. */
  readonly product = input<StockProduct | null>(null);
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
  /** `''` = « Non précisé ». Facultatif à dessein : l'emplacement se signale
   *  aussi bien plus tard, depuis le panneau de détail des stocks. */
  protected readonly storageLocationId = signal<string>('');

  /** Les erreurs de champ ne s'affichent qu'après une tentative d'envoi. */
  protected readonly submitted = signal(false);

  protected readonly editing = computed(() => this.product() !== null);

  /** Formes numériques des deux `<select>`, pour leur `[selected]` : les
   *  gabarits Angular ne peuvent pas appeler `Number(...)`. */
  protected readonly categoryIdNumber = computed(() =>
    this.categoryId() === '' ? null : Number(this.categoryId()),
  );
  protected readonly storageLocationIdNumber = computed(() =>
    this.storageLocationId() === '' ? null : Number(this.storageLocationId()),
  );

  /** L'unité de la denrée éditée, pour l'afficher sans la rendre modifiable. */
  protected readonly unitLabel = computed(() => {
    const unit = this.product()?.unit ?? '';
    return GOOD_UNIT_LABELS[unit as GoodUnit] ?? unit;
  });

  constructor() {
    // ⚠️ Les `input()` ne sont pas encore posés à la construction. Lu une seule
    // fois, et non par un `effect` : les champs doivent rester vidables.
    queueMicrotask(() => {
      const current = this.product();
      if (!current) return;
      this.name.set(current.name);
      this.unit.set(current.unit);
      this.brand.set(current.brand ?? '');
      this.categoryId.set(current.categoryId === null ? '' : String(current.categoryId));
      this.storageLocationId.set(
        current.storageLocationId === null ? '' : String(current.storageLocationId),
      );
    });
  }

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
  protected onStorageLocation(v: string): void {
    this.storageLocationId.set(v);
  }

  protected readonly valid = computed(
    () =>
      this.name().trim() !== '' &&
      (this.editing() || this.unit().trim() !== '') &&
      this.categoryId() !== '',
  );

  /** Sans catégorie chargée, le formulaire ne peut rien produire de valide. */
  protected readonly categoriesMissing = computed(() => this.store.categories().length === 0);

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (!this.valid()) return;

    const current = this.product();
    if (current) {
      await this.saveEdit(current);
      return;
    }

    const product = await this.store.createGood({
      name: this.name().trim(),
      unit: this.unit() as GoodUnit,
      // `''` et non `null` : la colonne est `NOT NULL` côté base.
      brand: this.brand().trim(),
      categoryId: Number(this.categoryId()),
      barcodes: this.barcode() ? [this.barcode() as string] : [],
      // `null` et non `''` : la colonne est nullable, et le validateur back
      // attend un entier ou rien.
      storageLocationId: this.storageLocationId() === '' ? null : Number(this.storageLocationId()),
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

  /** L'unité n'est pas envoyée : `PATCH /goods/:id` n'écrit que ce qu'il reçoit. */
  private async saveEdit(current: StockProduct): Promise<void> {
    const product = await this.store.updateGood(current.id, {
      name: this.name().trim(),
      // `''` et non `null` : la colonne est `NOT NULL` côté base.
      brand: this.brand().trim(),
      categoryId: Number(this.categoryId()),
      // `null` et non `''` : la colonne est nullable, et le validateur back
      // attend un entier ou rien.
      storageLocationId: this.storageLocationId() === '' ? null : Number(this.storageLocationId()),
    });

    if (!product) return;
    this.created()?.(product);
    this.toast.show({
      type: 'success',
      title: 'Produit modifié',
      message: `${product.name} est à jour.`,
    });
    this.modalService.close(this.id());
  }

  protected cancel(): void {
    this.modalService.close(this.id());
  }
}

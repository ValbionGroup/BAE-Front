import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucidePackage } from '@lucide/angular';
import { Btn } from '#shared/components/ui/btn/btn';
import { Field } from '#shared/components/ui/field/field';
import { Input } from '#shared/components/ui/input/input';
import { StocksStore } from '#core/store/stocks.store';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Saisie d'un produit du catalogue.
 *
 * La catégorie est un `<select>` natif : il n'existe pas de `bfd-select` dans
 * le dépôt, et en fabriquer un pour ce seul cas donnerait un composant partagé
 * conçu sur un unique usage — sans compter le clavier et les lecteurs d'écran,
 * que le natif donne gratuitement. Même raisonnement que `MemberEditModal` et
 * `VoucherCreateModal`.
 *
 * Le produit naît **sans lot**, donc à quantité zéro : créer une référence au
 * catalogue et en avoir en stock sont deux gestes distincts, et c'est un
 * réassort qui fait le second. Le sous-titre le dit, sans quoi on croirait
 * l'écran cassé en voyant apparaître une ligne à 0.
 */
@Component({
  selector: 'bfd-good-create-modal',
  imports: [Btn, Field, Input, ModalShell],
  templateUrl: './good-create-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoodCreateModal {
  readonly id = input.required<string>();

  private readonly modalService = inject(ModalService);
  protected readonly store = inject(StocksStore);

  protected readonly icPackage = LucidePackage;

  protected readonly name = signal<string>('');
  protected readonly unit = signal<string>('');
  protected readonly brand = signal<string>('');
  protected readonly categoryId = signal<string>('');

  /** Vrai une fois qu'on a tenté d'envoyer : les erreurs de champ ne
   *  s'affichent pas tant que l'utilisateur n'a rien soumis. */
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

  /**
   * Sans catégorie chargée, le formulaire ne peut rien produire de valide : on
   * le dit plutôt que de laisser l'utilisateur buter sur un sélecteur vide.
   */
  protected readonly categoriesMissing = computed(() => this.store.categories().length === 0);

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (!this.valid()) return;

    const brand = this.brand().trim();
    const ok = await this.store.createGood({
      name: this.name().trim(),
      unit: this.unit().trim(),
      brand: brand === '' ? null : brand,
      categoryId: Number(this.categoryId()),
    });

    if (ok) this.modalService.close(this.id());
  }

  protected cancel(): void {
    this.modalService.close(this.id());
  }
}

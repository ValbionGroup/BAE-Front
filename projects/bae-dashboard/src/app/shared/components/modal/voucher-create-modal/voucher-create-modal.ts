import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucideTicket } from '@lucide/angular';
import { Btn, Field, Input, ToastService } from '@bae/ui';
import { LogistiqueStore } from '#core/store/logistique.store';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Saisie d'un bon d'achat.
 *
 * L'enseigne est un `<select>` natif et non un composant maison : il n'existe
 * pas de `bfd-select` dans le dépôt, et en fabriquer un pour ce seul cas
 * donnerait un composant partagé conçu sur un unique usage — sans compter le
 * clavier et les lecteurs d'écran, que le natif donne gratuitement. Même
 * raisonnement que `MemberEditModal`.
 *
 * Enseigne et date sont requises ici alors que `supplier_id` est nullable en
 * base : un bon dont on ignore l'enseigne est un bon qu'on ne sait pas où
 * dépenser. La validation client double celle du back, elle ne fait pas
 * autorité — le message affiché en cas de refus vient de la réponse API.
 */
@Component({
  selector: 'bfd-voucher-create-modal',
  imports: [Btn, Field, Input, ModalShell],
  templateUrl: './voucher-create-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoucherCreateModal {
  readonly id = input.required<string>();

  private readonly modalService = inject(ModalService);
  private readonly toast = inject(ToastService);
  protected readonly store = inject(LogistiqueStore);

  protected readonly icTicket = LucideTicket;

  protected readonly supplierId = signal<string>('');
  protected readonly value = signal<string>('');
  protected readonly expiresAt = signal<string>('');
  protected readonly condition = signal<string>('');

  /** Vrai une fois qu'on a tenté d'envoyer : les erreurs de champ ne
   *  s'affichent pas tant que l'utilisateur n'a rien soumis. */
  protected readonly submitted = signal(false);

  protected onSupplierId(v: string): void {
    this.supplierId.set(v);
  }
  protected onValue(v: string): void {
    this.value.set(v);
  }
  protected onExpiresAt(v: string): void {
    this.expiresAt.set(v);
  }
  protected onCondition(v: string): void {
    this.condition.set(v);
  }

  /** La virgule est la séparatrice décimale française ; `Number` ne la lit pas. */
  protected readonly parsedValue = computed(() => {
    const raw = this.value().trim().replace(',', '.');
    if (raw === '') return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  });

  protected readonly valid = computed(
    () => this.supplierId() !== '' && this.expiresAt() !== '' && this.parsedValue() !== null,
  );

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    const amount = this.parsedValue();
    if (!this.valid() || amount === null) return;

    const condition = this.condition().trim();
    const ok = await this.store.createVoucher({
      supplierId: Number(this.supplierId()),
      value: amount,
      expiresAt: this.expiresAt(),
      condition: condition === '' ? null : condition,
    });

    if (!ok) return;
    this.toast.show({
      type: 'success',
      title: "Bon d'achat créé",
      message: `${this.formatAmount(amount)} € chez ${this.supplierName()}.`,
    });
    this.modalService.close(this.id());
  }

  /** Nom de l'enseigne choisie, pour le message de confirmation. */
  private supplierName(): string {
    const id = Number(this.supplierId());
    return this.store.suppliers().find((s) => s.id === id)?.name ?? 'une enseigne';
  }

  private formatAmount(value: number): string {
    return value.toFixed(2).replace('.', ',');
  }

  protected cancel(): void {
    this.modalService.close(this.id());
  }
}

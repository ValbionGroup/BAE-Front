import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucideTicket } from '@lucide/angular';
import { Btn, Field, Input, ToastService } from '@bae/ui';
import { LogistiqueStore } from '#core/store/logistique.store';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Édition complète d'un bon d'achat (enseigne, valeur, expiration,
 * condition) — distincte de la bascule used/unused, qui reste un geste d'un
 * clic sur la carte.
 *
 * Champs « edit » signaux, `null` tant que l'utilisateur n'a rien touché :
 * même convention que `MemberEditModal`, pour qu'un rafraîchissement du
 * store pendant que la modale est ouverte ne fige pas un champ non modifié
 * sur une valeur périmée.
 */
@Component({
  selector: 'bfd-voucher-edit-modal',
  imports: [Btn, Field, Input, ModalShell],
  templateUrl: './voucher-edit-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoucherEditModal {
  readonly id = input.required<string>();
  readonly voucherId = input.required<number>();

  private readonly modalService = inject(ModalService);
  private readonly toast = inject(ToastService);
  protected readonly store = inject(LogistiqueStore);

  protected readonly icTicket = LucideTicket;

  private readonly voucher = computed(() =>
    this.store.vouchers().find((entry) => entry.id === this.voucherId()),
  );

  private readonly supplierIdEdit = signal<string | null>(null);
  private readonly valueEdit = signal<string | null>(null);
  private readonly expiresAtEdit = signal<string | null>(null);
  private readonly conditionEdit = signal<string | null>(null);

  protected readonly supplierId = computed(
    () => this.supplierIdEdit() ?? String(this.voucher()?.supplierId ?? ''),
  );
  /** Forme numérique de `supplierId()`, pour le `[selected]` de chaque `<option>`
   *  — les templates Angular ne peuvent pas appeler `Number(...)` directement. */
  protected readonly supplierIdNumber = computed(() => {
    const raw = this.supplierId();
    return raw === '' ? null : Number(raw);
  });
  protected readonly value = computed(
    () => this.valueEdit() ?? this.formatAmount(this.voucher()?.value ?? 0),
  );
  protected readonly expiresAt = computed(
    () => this.expiresAtEdit() ?? this.voucher()?.expiresAt ?? '',
  );
  protected readonly condition = computed(
    () => this.conditionEdit() ?? this.voucher()?.condition ?? '',
  );

  /** Vrai une fois qu'on a tenté d'envoyer : les erreurs de champ ne
   *  s'affichent pas tant que l'utilisateur n'a rien soumis. */
  protected readonly submitted = signal(false);

  protected onSupplierId(v: string): void {
    this.supplierIdEdit.set(v);
  }
  protected onValue(v: string): void {
    this.valueEdit.set(v);
  }
  protected onExpiresAt(v: string): void {
    this.expiresAtEdit.set(v);
  }
  protected onCondition(v: string): void {
    this.conditionEdit.set(v);
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

  protected readonly saving = computed(() =>
    this.store.savingVoucherIds().includes(this.voucherId()),
  );

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    const amount = this.parsedValue();
    if (!this.valid() || amount === null) return;

    const condition = this.condition().trim();
    const ok = await this.store.updateVoucher(this.voucherId(), {
      supplierId: Number(this.supplierId()),
      value: amount,
      expiresAt: this.expiresAt(),
      condition: condition === '' ? null : condition,
    });

    if (!ok) return;
    this.toast.show({
      type: 'success',
      title: "Bon d'achat modifié",
      message: `${this.formatAmount(amount)} € chez ${this.supplierName()}.`,
    });
    this.modalService.close(this.id());
  }

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

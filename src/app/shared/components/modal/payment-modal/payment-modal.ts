import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { LucideEuro, LucideQrCode } from '@lucide/angular';
import { Btn } from '#shared/components/ui/btn/btn';
import { formatCents } from '#shared/utils/money';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

export type PaymentMethod = 'cash' | 'lydia';

/**
 * Choix du moyen de paiement, avant d'engager l'encaissement.
 *
 * Encaisser sans dire comment laisserait une ligne `transactions` dont le
 * `type` serait supposé plutôt que constaté. Lydia est présent mais désactivé :
 * l'accès à leur API n'est pas obtenu, et masquer le bouton laisserait croire
 * que le moyen n'existe pas.
 */
@Component({
  selector: 'bfd-payment-modal',
  imports: [Btn, ModalShell],
  templateUrl: './payment-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentModal {
  readonly id = input.required<string>();
  readonly totalCents = input.required<number>();
  readonly clientName = input<string>('Anonyme');
  readonly onConfirm = input<(method: PaymentMethod) => Promise<void> | void>(() => {});

  private readonly modalService = inject(ModalService);

  protected readonly submitting = signal(false);
  protected readonly formatCents = formatCents;
  protected readonly icCash = LucideEuro;
  protected readonly icLydia = LucideQrCode;

  protected async pay(method: PaymentMethod): Promise<void> {
    if (this.submitting()) return;
    this.submitting.set(true);
    await this.onConfirm()(method);
    this.modalService.close(this.id());
  }

  protected cancel(): void {
    this.modalService.close(this.id());
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucideEuro, LucideQrCode } from '@lucide/angular';
import { Btn, formatCents, parseEuros } from '@bae/ui';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

export type PaymentMethod = 'cash' | 'lydia';

const DENOMINATIONS = [5000, 2000, 1000, 500, 200, 100, 50, 20, 10];

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

  protected readonly step = signal<'method' | 'cash'>('method');
  protected readonly given = signal('');
  protected readonly givenCents = computed(() => parseEuros(this.given()));

  protected readonly changeCents = computed(() => {
    const given = this.givenCents();
    return given === null ? null : given - this.totalCents();
  });

  protected readonly canConfirmCash = computed(() => {
    const change = this.changeCents();
    return change !== null && change >= 0 && !this.submitting();
  });

  protected readonly denominations = DENOMINATIONS;

  protected addDenomination(cents: number): void {
    this.setGiven((this.givenCents() ?? 0) + cents);
  }

  protected setExact(): void {
    this.setGiven(this.totalCents());
  }

  protected clearGiven(): void {
    this.given.set('');
  }

  private setGiven(cents: number): void {
    this.given.set(formatCents(cents));
  }

  protected onGivenInput(value: string): void {
    this.given.set(value);
  }

  protected choose(method: PaymentMethod): void {
    // ⚠️ Le montant remis n'est **pas** enregistré : `transactions.amount` porte
    // le total de la commande, pas ce qui a transité par la caisse. Ce second
    // écran est une aide au comptage, pas une donnée métier — le jour où le
    // fond de caisse devra être rapproché, il faudra une colonne pour ça.
    if (method === 'cash') {
      this.step.set('cash');
      this.given.set('');
      return;
    }
    void this.pay(method);
  }

  protected async pay(method: PaymentMethod): Promise<void> {
    if (this.submitting()) return;
    this.submitting.set(true);
    await this.onConfirm()(method);
    this.modalService.close(this.id());
  }

  protected back(): void {
    this.step.set('method');
  }

  protected cancel(): void {
    this.modalService.close(this.id());
  }
}

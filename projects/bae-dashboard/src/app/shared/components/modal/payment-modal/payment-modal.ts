import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { LucideCreditCard, LucideEuro, LucideQrCode } from '@lucide/angular';
import { Btn, formatCents, parseEuros } from '@bae/ui';
import type { PaymentMethod } from '#core/models/order.model';
import { CaisseStore } from '#core/store/caisse.store';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

export type { PaymentMethod } from '#core/models/order.model';

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
  private readonly caisse = inject(CaisseStore);

  protected readonly submitting = signal(false);
  protected readonly formatCents = formatCents;
  protected readonly icCash = LucideEuro;
  protected readonly icLydia = LucideQrCode;
  protected readonly icCard = LucideCreditCard;

  protected readonly step = signal<'method' | 'cash' | 'card'>('method');

  /** Le paiement en cours sur le terminal, `null` dès qu'il est conclu. */
  protected readonly cardPayment = this.caisse.cardPayment;

  /** « Vérifier l'état » n'apparaît qu'au bout de 20 s. */
  protected readonly canRecheck = signal(false);
  private recheckTimer?: ReturnType<typeof setTimeout>;

  private readonly armed = signal(false);
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

  protected titleOf(step: 'method' | 'cash' | 'card'): string {
    switch (step) {
      case 'cash':
        return 'Paiement en espèces';
      case 'card':
        return 'Paiement par carte';
      case 'method':
        return 'Moyen de paiement';
    }
  }

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

  private readonly closeOnSettled = effect(() => {
    if (this.step() !== 'card') return;
    if (!this.armed()) return;
    if (this.cardPayment() !== null) return;

    clearTimeout(this.recheckTimer);
    this.modalService.close(this.id());
  });

  protected choose(method: PaymentMethod): void {
    if (method === 'cash') {
      this.step.set('cash');
      this.given.set('');
      return;
    }

    if (method === 'card') {
      this.step.set('card');
      this.canRecheck.set(false);
      this.armed.set(false);
      this.recheckTimer = setTimeout(() => this.canRecheck.set(true), 20_000);

      void Promise.resolve(this.onConfirm()(method)).finally(() => this.armed.set(true));
      return;
    }

    void this.pay(method);
  }

  protected async cancelCard(): Promise<void> {
    await this.caisse.cancelCardPayment();
    this.modalService.close(this.id());
  }

  protected async recheck(): Promise<void> {
    await this.caisse.refreshCardPayment();
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
    clearTimeout(this.recheckTimer);
    this.modalService.close(this.id());
  }
}

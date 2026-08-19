import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCheck, LucideDynamicIcon, LucideLoader, LucideX } from '@lucide/angular';
import { Btn, Card, formatCents } from '@bae/ui';

import { POLL_DELAYS_MS, PaymentsService, type PaymentStatus } from '../../core/payments.service';

/** Les états dont on ne revient pas : inutile de continuer à interroger. */
const TERMINAL: readonly PaymentStatus[] = ['paid', 'refused', 'cancelled', 'expired'];

@Component({
  selector: 'bfp-paiement',
  imports: [RouterLink, Btn, Card, LucideDynamicIcon],
  templateUrl: './paiement.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Paiement implements OnInit {
  readonly orderRef = input.required<string>();

  private readonly payments = inject(PaymentsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly icCheck = LucideCheck;
  protected readonly icX = LucideX;
  protected readonly icWait = LucideLoader;
  protected readonly formatCents = formatCents;

  protected readonly status = signal<PaymentStatus | null>(null);
  protected readonly amountCents = signal(0);
  /** Vrai une fois le calendrier épuisé sans réponse définitive. */
  protected readonly gaveUp = signal(false);

  protected readonly settled = computed(() => {
    const current = this.status();
    return current !== null && TERMINAL.includes(current);
  });

  private timer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.stop());
    this.poll(0);
  }

  private poll(attempt: number): void {
    const delay = POLL_DELAYS_MS[attempt];

    if (delay === undefined) {
      this.gaveUp.set(true);
      return;
    }

    this.timer = setTimeout(() => {
      this.payments.status(this.orderRef()).subscribe({
        next: (payment) => {
          this.status.set(payment.status);
          this.amountCents.set(payment.amountCents);
          if (!this.settled()) this.poll(attempt + 1);
        },
        // Une lecture qui échoue n'est pas un verdict : le paiement peut très
        // bien avoir abouti pendant que le réseau vacillait.
        error: () => this.poll(attempt + 1),
      });
    }, delay);
  }

  private stop(): void {
    if (this.timer !== null) clearTimeout(this.timer);
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { LucideCreditCard, LucideEuro, LucideQrCode } from '@lucide/angular';
import { Btn, formatCents, parseEuros } from '@bae/ui';
import type { PaymentMethod } from '#core/models/order.model';
import { CaisseStore } from '#core/store/caisse.store';
import { selectMember } from '#core/store/auth/auth.selector';
import { BarcodeScannerService, QR_FORMATS } from '#core/services/barcode/barcode-scanner-service';
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
export class PaymentModal implements OnDestroy {
  readonly id = input.required<string>();
  readonly totalCents = input.required<number>();
  readonly clientName = input<string>('Anonyme');
  /** `Promise<string | null>` : `null` vaut succès, une chaîne est le message
   *  d'échec — c'est ce que l'étape Lydia utilise pour rester ouverte plutôt
   *  que de refermer aveuglément comme `cash`/`card`. */
  readonly onConfirm = input<
    (method: PaymentMethod, paymentData?: string) => Promise<string | null> | Promise<void> | void
  >(() => {});

  private readonly modalService = inject(ModalService);
  private readonly caisse = inject(CaisseStore);
  private readonly scanner = inject(BarcodeScannerService);
  private readonly member = inject(Store).selectSignal(selectMember);

  protected readonly submitting = signal(false);
  protected readonly formatCents = formatCents;
  protected readonly icCash = LucideEuro;
  protected readonly icLydia = LucideQrCode;
  protected readonly icCard = LucideCreditCard;

  protected readonly step = signal<'method' | 'cash' | 'card' | 'lydia'>('method');

  /** `null` tant que le membre connecté a un téléphone renseigné — sinon le
   *  motif à afficher : Lydia exige le numéro du caissier. */
  protected readonly lydiaDisabledReason = computed(() =>
    this.member()?.phone ? null : 'Renseignez votre téléphone dans Équipe avant d’utiliser Lydia.',
  );

  private readonly videoRef = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  protected readonly lydiaCamera = signal<'idle' | 'starting' | 'scanning'>('idle');
  /** Caméra indisponible, refusée, etc. — distinct d'un refus de paiement. */
  protected readonly lydiaScanError = signal<string | null>(null);
  /** Le message renvoyé par `onConfirm` en cas d'échec du paiement lui-même. */
  protected readonly lydiaFailure = signal<string | null>(null);

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

  ngOnDestroy(): void {
    this.scanner.stop();
  }

  protected titleOf(step: 'method' | 'cash' | 'card' | 'lydia'): string {
    switch (step) {
      case 'cash':
        return 'Paiement en espèces';
      case 'card':
        return 'Paiement par carte';
      case 'lydia':
        return 'Paiement par QR Lydia';
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

    this.step.set('lydia');
    this.lydiaFailure.set(null);
    void this.startLydiaScan();
  }

  protected async startLydiaScan(): Promise<void> {
    this.lydiaScanError.set(null);
    this.lydiaCamera.set('starting');

    const started = await this.scanner.start(
      this.videoRef().nativeElement,
      (code) => void this.onLydiaScanned(code),
      QR_FORMATS,
    );

    if (started) {
      this.lydiaCamera.set('scanning');
    } else {
      this.lydiaCamera.set('idle');
      this.lydiaScanError.set('Caméra indisponible — choisissez un autre moyen de paiement.');
    }
  }

  private async onLydiaScanned(paymentData: string): Promise<void> {
    this.scanner.stop();
    this.lydiaCamera.set('idle');
    this.submitting.set(true);

    const failure = await this.onConfirm()('lydia', paymentData);

    this.submitting.set(false);
    if (!failure) {
      this.modalService.close(this.id());
      return;
    }
    this.lydiaFailure.set(failure);
  }

  protected rescanLydia(): void {
    this.lydiaFailure.set(null);
    void this.startLydiaScan();
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
    this.scanner.stop();
    this.modalService.close(this.id());
  }
}

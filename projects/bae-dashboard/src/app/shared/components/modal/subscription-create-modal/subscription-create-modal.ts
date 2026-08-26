import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucideBadgeCheck } from '@lucide/angular';
import { Btn, Field, Input, ToastService, parseApiDate, formatCents, parseEuros } from '@bae/ui';
import { ClientsStore } from '#core/store/clients.store';
import {
  FastPassesService,
  type FastPassRow,
} from '#core/services/fast-passes/fast-passes-service';
import type { ClientRow } from '#pages/authed/adherents/adherents.types';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

type PaymentType = 'cash' | 'lydia';

/**
 * Un renouvellement **ajoute une ligne**, il n'en modifie aucune. Le paiement est
 * facultatif : sans lui, aucune transaction n'est créée.
 *
 * ⚠️ Le champ se saisit en **euros** mais part en **centimes entiers** :
 * `transactions.amount` est un `integer`, et le validator refuse toute décimale.
 * Envoyer 15 au lieu de 1500 enregistrerait une cotisation de quinze centimes.
 */
@Component({
  selector: 'bfd-subscription-create-modal',
  imports: [Btn, Field, Input, ModalShell],
  templateUrl: './subscription-create-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionCreateModal {
  readonly id = input.required<string>();
  readonly client = input.required<ClientRow>();
  /** Le store recharge la liste et les compteurs, jamais la fiche ouverte. */
  readonly onSaved = input<() => void>(() => {});

  private readonly modalService = inject(ModalService);
  private readonly fastPasses = inject(FastPassesService);
  private readonly toast = inject(ToastService);
  protected readonly store = inject(ClientsStore);

  protected readonly icPass = LucideBadgeCheck;

  protected readonly plans = signal<readonly FastPassRow[]>([]);
  protected readonly plansLoading = signal(true);
  protected readonly plansError = signal<string | null>(null);

  protected readonly fastPassId = signal<string>('');
  protected readonly subscribedAt = signal<string>(todayIso());
  protected readonly paymentType = signal<'' | PaymentType>('');
  /** `null` = suit le prix de la formule, jusqu'à la première frappe. */
  private readonly amountEdit = signal<string | null>(null);

  protected readonly submitted = signal(false);

  constructor() {
    // Ne rien lire de `input.required()` ici : cela lèverait `NG0950`.
    this.store.clearSaveError();
    this.fastPasses.getAll().subscribe({
      next: (rows) => {
        this.plans.set([...rows].sort((a, b) => a.durationYears - b.durationYears));
        this.plansLoading.set(false);
      },
      error: () => {
        this.plansError.set('Impossible de charger les formules.');
        this.plansLoading.set(false);
      },
    });
  }

  protected readonly selectedPlan = computed<FastPassRow | null>(() => {
    const id = Number(this.fastPassId());
    return this.plans().find((plan) => plan.id === id) ?? null;
  });

  protected readonly amount = computed(() => {
    const edited = this.amountEdit();
    if (edited !== null) return edited;
    const plan = this.selectedPlan();
    return plan === null ? '' : formatCents(plan.priceCents);
  });

  /** Saisie en euros, envoyée en **centimes**. `parseEuros` lit la virgule. */
  protected readonly parsedAmount = computed(() => parseEuros(this.amount()));

  /** Le back ajoute `duration` **années** à la date de souscription. */
  protected readonly expiresAt = computed<string | null>(() => {
    const plan = this.selectedPlan();
    const start = this.subscribedAt();
    if (plan === null || start === '') return null;
    const date = parseApiDate(start);
    if (Number.isNaN(date.getTime())) return null;
    date.setFullYear(date.getFullYear() + plan.durationYears);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  });

  protected readonly valid = computed(() => {
    if (this.fastPassId() === '' || this.subscribedAt() === '') return false;
    return this.paymentType() === '' || this.parsedAmount() !== null;
  });

  protected onFastPassId(value: string): void {
    this.fastPassId.set(value);
  }

  protected onSubscribedAt(value: string): void {
    this.subscribedAt.set(value);
  }

  protected onPaymentType(value: string): void {
    this.paymentType.set(value === '' ? '' : (value as PaymentType));
  }

  protected onAmount(value: string): void {
    this.amountEdit.set(value);
  }

  protected close(): void {
    this.store.clearSaveError();
    this.modalService.close(this.id());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (!this.valid() || this.store.saving()) return;

    const type = this.paymentType();
    const amount = this.parsedAmount();
    const ok = await this.store.subscribe({
      userId: this.client().id,
      fastPassId: Number(this.fastPassId()),
      subscribedAt: this.subscribedAt(),
      payment: type === '' || amount === null ? undefined : { amount, type },
    });

    if (!ok) return;
    this.toast.show({
      type: 'success',
      title: 'Cotisation enregistrée',
      message: `${this.selectedPlan()?.label ?? 'Formule'} pour ${this.client().name ?? this.client().email}.`,
    });
    this.onSaved()();
    this.modalService.close(this.id());
  }
}

/** `new Date()` n'est pas disponible dans un gabarit. */
function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

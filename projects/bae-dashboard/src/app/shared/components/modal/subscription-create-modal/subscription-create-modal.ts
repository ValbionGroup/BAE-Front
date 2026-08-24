import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucideBadgeCheck } from '@lucide/angular';
import { Btn, Field, Input, ToastService } from '@bae/ui';
import { ClientsStore } from '#core/store/clients.store';
import {
  FastPassesService,
  type FastPassRow,
} from '#core/services/fast-passes/fast-passes-service';
import type { ClientRow } from '#pages/authed/adherents/adherents.types';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/** Le back accepte les deux, et rien d'autre (`createSubscriptionValidator`). */
type PaymentType = 'cash' | 'lydia';

/**
 * Enregistrement d'une cotisation — le geste s'appelle « renouveler » sur une
 * fiche, « enregistrer une cotisation » depuis la liste, mais c'est le même :
 * un renouvellement **ajoute une ligne**, il n'en modifie aucune.
 *
 * Pas de sélecteur d'adhérent : la page est déjà une liste maîtresse avec une
 * ligne sélectionnée en permanence, et lui ajouter un second choix ferait deux
 * endroits pour désigner la même personne — dont l'un pourrait contredire ce
 * que la fiche ouverte affiche.
 *
 * Le montant est en **euros** : `transactions.amount` est un `decimal(10,2)`,
 * comme `fast_passes.price`. Le paiement est facultatif — une cotisation peut
 * être offerte, et l'encaissement en ligne n'existe pas depuis cet écran.
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
  /** La page relit le détail : le store recharge la liste et les compteurs,
   *  pas l'historique de la fiche ouverte. */
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
  /** `null` tant qu'on n'a pas saisi de montant : il suit alors le prix de la
   *  formule choisie, et cesse de le suivre dès la première frappe. */
  private readonly amountEdit = signal<string | null>(null);

  /** Vrai une fois qu'on a tenté d'envoyer : les erreurs de champ ne
   *  s'affichent pas tant que l'utilisateur n'a rien soumis. */
  protected readonly submitted = signal(false);

  constructor() {
    // Aucune entrée requise n'est lue ici : `input.required()` dans un
    // constructeur lève `NG0950` (le piège de la modale de clôture).
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
    return plan === null ? '' : plan.priceEuros.toFixed(2).replace('.', ',');
  });

  /** La virgule est la séparatrice décimale française ; `Number` ne la lit pas. */
  protected readonly parsedAmount = computed(() => {
    const raw = this.amount().trim().replace(',', '.');
    if (raw === '') return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  });

  /** Le back calcule l'expiration en ajoutant `duration` **années** à la date
   *  de souscription : l'annoncer évite de découvrir l'unité après coup. */
  protected readonly expiresAt = computed<string | null>(() => {
    const plan = this.selectedPlan();
    const start = this.subscribedAt();
    if (plan === null || start === '') return null;
    const date = new Date(start);
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
      // Sans méthode de paiement, aucune transaction n'est créée : c'est ce qui
      // distingue une cotisation offerte d'une cotisation à 0 €.
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

/** Calculée ici et non dans le gabarit : `new Date()` n'y est pas disponible. */
function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

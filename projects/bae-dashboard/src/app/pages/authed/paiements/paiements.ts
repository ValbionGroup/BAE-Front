import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { lastValueFrom } from 'rxjs';
import {
  LucideCheck,
  LucideDynamicIcon,
  LucideFilter,
  LucideQrCode,
  LucideTriangleAlert,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import {
  TransactionsService,
  type ApiTransaction,
  type TransactionType,
} from '#core/services/transactions/transactions-service';
import {
  PaymentsService,
  type ApiPayment,
  type PaymentStatus,
} from '#core/services/payments/payments-service';
import { EventsStore } from '#core/store/events.store';
import { Badge, BadgeKind, formatCents } from '@bae/ui';

type LoadState = 'init' | 'loading' | 'loaded' | 'error';

interface Row {
  readonly id: number;
  readonly reference: string;
  readonly when: string;
  readonly method: string;
  readonly amount: number;
  readonly orderCount: number;
}

interface PaymentRow {
  readonly id: number;
  readonly orderRef: string;
  readonly when: string;
  readonly payer: string;
  readonly kind: string;
  readonly statusLabel: string;
  readonly statusKind: BadgeKind;
  readonly amount: string;
  readonly reference: string;
}

const METHOD_LABEL: Record<TransactionType, string> = {
  cash: 'Espèces',
  lydia: 'Lydia',
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'En attente',
  paid: 'Payé',
  refused: 'Refusé',
  cancelled: 'Annulé',
  expired: 'Expiré',
};

const STATUS_KIND: Record<PaymentStatus, BadgeKind> = {
  pending: 'warn',
  paid: 'ok',
  refused: 'danger',
  cancelled: 'neutral',
  expired: 'ghost',
};

const KIND_LABEL: Record<string, string> = {
  pre_order: 'Précommande',
  subscription: 'Cotisation',
};

@Component({
  selector: 'bfd-paiements',
  imports: [Badge, LucideDynamicIcon],
  templateUrl: './paiements.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
})
export class Paiements implements OnInit {
  private readonly transactionsService = inject(TransactionsService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly events = inject(EventsStore);

  protected readonly icFilter = LucideFilter;
  protected readonly icQr = LucideQrCode;
  protected readonly icCheck = LucideCheck;
  protected readonly icAlert = LucideTriangleAlert;

  protected readonly loadState = signal<LoadState>('init');
  protected readonly loadError = signal<string | null>(null);
  private readonly transactions = signal<readonly ApiTransaction[]>([]);
  private readonly payments = signal<readonly ApiPayment[]>([]);
  protected readonly paymentsError = signal<string | null>(null);

  /** `null` = toutes soirées confondues, ce qui est le repli hors service. */
  protected readonly activeEvent = this.events.activeEvent;

  constructor() {
    inject(PageHeaderService).set({
      title: 'Paiements',
      subtitle: 'Transactions encaissées',
      breadcrumb: ['Soirée', 'Paiements'],
      activeNavId: 'pay',
    });

    // Dépendre de l'identifiant, pas de l'objet : `activeEvent` dérive du
    // dictionnaire que `load()` remplace, et en dépendre créerait une boucle.
    effect(() => {
      const eventId = this.events.activeEventId();
      untracked(() => void this.refresh(eventId));
    });
  }

  ngOnInit(): void {
    void this.events.load();
    // Hors de l'effet de soirée : `payments` n'a pas d'`event_id`, une demande de
    // paiement n'appartient à aucune soirée avant d'avoir abouti.
    void this.refreshPayments();
  }

  protected readonly rows = computed<readonly Row[]>(() =>
    this.transactions().map((transaction) => ({
      id: transaction.id,
      reference: `T-${String(transaction.id).padStart(5, '0')}`,
      when: formatWhen(transaction.createdAt),
      method: METHOD_LABEL[transaction.type] ?? transaction.type,
      amount: transaction.amount,
      orderCount: transaction.orderIds.length,
    })),
  );

  /**
   * ⚠️ Deux KPI seulement, là où la maquette en montrait quatre.
   * `transactions.type` est un enum `cash | lydia` : la distinction « Lydia
   * online » / « QR sur place » **n'existe pas en base**. L'afficher demanderait
   * d'inventer la répartition, et un chiffre faux sur un écran d'argent est pire
   * qu'un chiffre absent.
   */
  protected readonly kpis = computed(() => {
    const all = this.transactions();
    const sum = (type: TransactionType) =>
      all.filter((t) => t.type === type).reduce((total, t) => total + t.amount, 0);
    const count = (type: TransactionType) => all.filter((t) => t.type === type).length;

    return [
      {
        label: 'Total encaissé',
        value: formatMoney(all.reduce((total, t) => total + t.amount, 0)),
        detail: `${all.length} transactions`,
      },
      {
        label: 'Espèces',
        value: formatMoney(sum('cash')),
        detail: `${count('cash')} transactions`,
      },
      {
        label: 'Lydia',
        value: formatMoney(sum('lydia')),
        detail: `${count('lydia')} transactions`,
      },
    ];
  });

  /**
   * Les paiements en ligne, avec les identifiants du prestataire — c'est ce
   * qu'on compare au relevé Lydia. `transactions` ne les porte pas : elle naît
   * de l'encaissement, quand un paiement existe dès la demande.
   */
  protected readonly paymentRows = computed<readonly PaymentRow[]>(() =>
    this.payments().map((payment) => ({
      id: payment.id,
      orderRef: payment.orderRef,
      when: formatWhen(payment.paidAt ?? payment.createdAt),
      payer: payment.payerName ?? payment.payerEmail ?? '—',
      kind: KIND_LABEL[payment.kind] ?? payment.kind,
      statusLabel: STATUS_LABEL[payment.status] ?? payment.status,
      statusKind: STATUS_KIND[payment.status] ?? 'neutral',
      amount: formatCents(payment.amountCents),
      reference: payment.providerReference ?? payment.transactionIdentifier ?? '—',
    })),
  );

  protected formatMoney(value: number): string {
    return formatMoney(value);
  }

  private async refreshPayments(): Promise<void> {
    this.paymentsError.set(null);
    try {
      this.payments.set(await lastValueFrom(this.paymentsService.getAll()));
    } catch {
      this.payments.set([]);
      this.paymentsError.set('Impossible de charger les paiements en ligne.');
    }
  }

  private async refresh(eventId: string | null): Promise<void> {
    this.loadState.set('loading');
    this.loadError.set(null);
    try {
      const numeric = eventId === null ? undefined : Number(eventId);
      const list = await lastValueFrom(
        this.transactionsService.getAll(
          numeric !== undefined && Number.isFinite(numeric) ? numeric : undefined,
        ),
      );
      this.transactions.set(list);
      this.loadState.set('loaded');
    } catch {
      this.transactions.set([]);
      this.loadError.set('Impossible de charger les transactions.');
      this.loadState.set('error');
    }
  }
}

function formatMoney(value: number): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatWhen(iso: string | null): string {
  if (iso === null) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

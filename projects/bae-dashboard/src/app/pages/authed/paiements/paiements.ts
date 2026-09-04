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
import { LucideDynamicIcon, LucideTriangleAlert } from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import {
  PAYMENT_METHOD_LABEL,
  TransactionsService,
  type ApiTransaction,
  type TransactionNature,
  type TransactionType,
} from '#core/services/transactions/transactions-service';
import {
  PaymentsService,
  type ApiPayment,
  type PaymentStatus,
} from '#core/services/payments/payments-service';
import { EventsStore } from '#core/store/events.store';
import { Badge, type BadgeKind } from '@bae/ui';

type LoadState = 'init' | 'loading' | 'loaded' | 'error';

interface LedgerRow {
  readonly id: number;
  readonly title: string;
  readonly detail: string;
  readonly method: string;
  readonly payer: string;
  readonly amount: string;
  readonly nature: TransactionNature;
  /** Intitulé, payeur et référence concaténés en minuscules, pour la recherche. */
  readonly haystack: string;
}

interface UnsettledRow {
  readonly id: number;
  readonly orderRef: string;
  readonly when: string;
  readonly payer: string;
  readonly statusLabel: string;
  readonly statusKind: BadgeKind;
  readonly amount: string;
}

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

const NATURE_LABEL: Record<TransactionNature, string> = {
  order: 'Caisse',
  pre_order: 'Précommande',
  subscription: 'Cotisation',
  other: 'Encaissement',
};

const PAGE_SIZE = 50;

/** `null` = pas de filtre. L'ordre est celui des onglets. */
const NATURE_TABS: readonly { readonly id: TransactionNature | null; readonly label: string }[] = [
  { id: null, label: 'Tout' },
  { id: 'order', label: 'Caisse' },
  { id: 'pre_order', label: 'Précommandes' },
  { id: 'subscription', label: 'Cotisations' },
];

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

  protected readonly icAlert = LucideTriangleAlert;

  protected readonly loadState = signal<LoadState>('init');
  protected readonly loadError = signal<string | null>(null);
  private readonly transactions = signal<readonly ApiTransaction[]>([]);
  private readonly payments = signal<readonly ApiPayment[]>([]);
  protected readonly paymentsError = signal<string | null>(null);

  protected readonly searchQuery = signal('');
  protected readonly activeNature = signal<TransactionNature | null>(null);
  protected readonly natureTabs = NATURE_TABS;
  private readonly shown = signal(PAGE_SIZE);

  /** `null` = toutes soirées confondues, ce qui est le repli hors service. */
  protected readonly activeEvent = this.events.activeEvent;

  constructor() {
    inject(PageHeaderService).set({
      title: 'Paiements',
      subtitle: 'Registre des encaissements',
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
    // `refresh()` : ces écrans suivent la soirée en cours, et `load()` ne relit
    // rien une fois le dictionnaire chargé.
    void this.events.refresh();
    void this.refreshPayments();
  }

  private readonly allRows = computed<readonly LedgerRow[]>(() =>
    this.transactions().map((transaction) => {
      const reference = `T-${String(transaction.id).padStart(5, '0')}`;
      const title =
        transaction.label === null
          ? NATURE_LABEL[transaction.nature]
          : `${NATURE_LABEL[transaction.nature]} · ${transaction.label}`;
      const payer = transaction.payer ?? 'anon.';

      return {
        id: transaction.id,
        title,
        detail: [
          reference,
          formatWhen(transaction.createdAt),
          transaction.itemCount > 0 ? formatItems(transaction.itemCount) : null,
        ]
          .filter((part): part is string => part !== null)
          .join(' · '),
        method: PAYMENT_METHOD_LABEL[transaction.type],
        payer,
        amount: formatMoney(transaction.amount),
        nature: transaction.nature,
        haystack: `${title} ${payer} ${reference}`.toLowerCase(),
      };
    }),
  );

  private readonly matchingRows = computed<readonly LedgerRow[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const nature = this.activeNature();

    return this.allRows().filter(
      (row) =>
        (nature === null || row.nature === nature) &&
        (query === '' || row.haystack.includes(query)),
    );
  });

  protected readonly rows = computed(() => this.matchingRows().slice(0, this.shown()));

  protected readonly hiddenCount = computed(() => this.matchingRows().length - this.rows().length);

  protected showMore(): void {
    this.shown.update((count) => count + PAGE_SIZE);
  }

  /**
   * Les transactions nées d'une demande en ligne aboutie. `payments` est la
   * seule source de ce lien : `transactions.type` dit le moyen, pas le canal.
   */
  private readonly onlineIds = computed(
    () =>
      new Set(
        this.payments()
          .filter((payment) => payment.status === 'paid' && payment.transactionId !== null)
          .map((payment) => payment.transactionId as number),
      ),
  );

  private readonly unsettledPayments = computed(() =>
    this.payments().filter((payment) => payment.status !== 'paid'),
  );

  /**
   * La maquette séparait « Lydia online » et « QR sur place » ; ce découpage-là
   * n'existe pas encore en base. Le canal en ligne / comptoir dit la même chose
   * et se déduit sans rien inventer.
   */
  protected readonly kpis = computed(() => {
    const all = this.transactions();
    const online = this.onlineIds();
    const fromOnline = all.filter((transaction) => online.has(transaction.id));
    const fromCounter = all.filter((transaction) => !online.has(transaction.id));
    const waiting = this.unsettledPayments();
    const sum = (list: readonly { amount: number }[]) =>
      list.reduce((total, entry) => total + entry.amount, 0);

    return [
      { label: 'Encaissé', value: formatMoney(sum(all)), detail: countLabel(all.length) },
      {
        label: 'En ligne',
        value: formatMoney(sum(fromOnline)),
        detail: countLabel(fromOnline.length),
      },
      {
        label: 'Au comptoir',
        value: formatMoney(sum(fromCounter)),
        detail: countLabel(fromCounter.length),
      },
      {
        label: 'En attente',
        value: formatMoney(waiting.reduce((total, payment) => total + payment.amountCents, 0)),
        detail: `${waiting.length} demande${waiting.length > 1 ? 's' : ''}`,
      },
    ];
  });

  /**
   * Les demandes qui n'ont jamais abouti — les seules que le registre ignore :
   * une demande `paid` a déjà créé sa transaction et y figure donc déjà.
   */
  protected readonly unsettled = computed<readonly UnsettledRow[]>(() =>
    this.unsettledPayments().map((payment) => ({
      id: payment.id,
      orderRef: payment.orderRef,
      when: formatWhen(payment.createdAt),
      payer: payment.payerName ?? payment.payerEmail ?? 'anon.',
      statusLabel: STATUS_LABEL[payment.status] ?? payment.status,
      statusKind: STATUS_KIND[payment.status] ?? 'neutral',
      amount: formatMoney(payment.amountCents),
    })),
  );

  protected readonly unsettledTotal = computed(() =>
    formatMoney(this.unsettledPayments().reduce((total, p) => total + p.amountCents, 0)),
  );

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

/**
 * Formate des **centimes**, séparateur de milliers compris.
 *
 * `formatCents` de `@bae/ui` dirait la même chose sans grouper les milliers, et
 * un total de soirée dépasse les mille euros.
 */
function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function countLabel(count: number): string {
  return `${count} transaction${count > 1 ? 's' : ''}`;
}

function formatItems(count: number): string {
  return `${count} ${count > 1 ? 'articles' : 'article'}`;
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

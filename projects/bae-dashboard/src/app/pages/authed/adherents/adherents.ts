import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  LucideCheck,
  LucideChevronRight,
  LucideDownload,
  LucideDynamicIcon,
  LucideEllipsis,
  LucideFunnel,
  LucideMail,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideTriangleAlert,
  LucideUpload,
} from '@lucide/angular';
import { Router } from '@angular/router';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { ClientsStore } from '#core/store/clients.store';
import {
  Btn,
  Badge,
  BadgeKind,
  Avatar,
  Input,
  Skeleton,
  DetailSheet,
  DropdownService,
  formatCents,
  parseApiDate,
} from '@bae/ui';
import { ModalService } from '#shared/components/modal/modal.service';
import { ClientEditModal } from '#shared/components/modal/client-edit-modal/client-edit-modal';
import { SubscriptionCreateModal } from '#shared/components/modal/subscription-create-modal/subscription-create-modal';
import type { ClientDetail, ClientRow, MembershipStatus } from './adherents.types';

type SortKey = 'name' | 'expiresAt' | 'status';
type SortDir = 'asc' | 'desc';

const SORT_LABELS: Record<SortKey, string> = {
  name: 'Nom',
  expiresAt: 'Expiration',
  status: 'Cotisation',
};

const STATUS_RANK: Record<MembershipStatus, number> = { expired: 0, active: 1, none: 2 };

/** Même règle que `/clients/summary`, sinon l'onglet et son compteur divergent. */
const EXPIRY_WARN_WINDOW_DAYS = 30;

function expiringSoon(row: ClientRow): boolean {
  return (
    row.status === 'active' &&
    row.daysUntilExpiry !== null &&
    row.daysUntilExpiry <= EXPIRY_WARN_WINDOW_DAYS
  );
}

interface InfoRow {
  readonly k: string;
  readonly v: string;
  readonly missing?: string;
}

interface StatTile {
  readonly k: string;
  readonly v: string;
}

const STATUS_LABELS: Record<MembershipStatus, string> = {
  active: 'À jour',
  expired: 'Expirée',
  none: 'Non-adhérent',
};

import { PageAction, PageActions } from '#shared/components/page-actions/page-actions';

@Component({
  selector: 'bfd-adherents',
  imports: [Btn, Badge, Avatar, Input, Skeleton, LucideDynamicIcon, PageActions, DetailSheet],
  templateUrl: './adherents.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
})
export class Adherents implements OnInit {
  protected readonly pageActions = computed<readonly PageAction[]>(() => [
    {
      label: 'Export CSV',
      icon: this.icDownload,
      kind: 'ghost',
      disabled: true,
      title: "Aucun endpoint d'export : le back ne sait pas encore produire ce fichier.",
      run: () => {},
    },
    {
      label: 'Import liste',
      icon: this.icUpload,
      disabled: true,
      title:
        'Un compte naît d’une connexion EirbConnect, jamais d’un fichier : reste à décider ce qu’un import créerait.',
      run: () => {},
    },
    {
      label: 'Enregistrer une cotisation',
      icon: this.icPlus,
      kind: 'primary',
      primary: true,
      disabled: this.selected() === null,
      title:
        this.selected() === null
          ? 'Sélectionnez un adhérent : un compte se crée par EirbConnect, jamais ici.'
          : `Enregistrer une cotisation pour ${this.displayName(this.selected()!)}.`,
      run: () => this.openSubscription(),
    },
  ]);

  private readonly pageHeader = inject(PageHeaderService);
  private readonly router = inject(Router);
  private readonly modal = inject(ModalService);
  private readonly dropdown = inject(DropdownService);
  protected readonly store = inject(ClientsStore);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  protected readonly searchQuery = signal('');
  protected readonly activeFilter = signal(0);
  protected readonly sortKey = signal<SortKey>('name');
  protected readonly sortDir = signal<SortDir>('asc');
  protected readonly selectedId = signal<number | null>(null);
  protected readonly sheetOpen = signal(false);
  protected readonly detail = signal<ClientDetail | null>(null);
  protected readonly detailLoading = signal(false);

  constructor() {
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });

    effect(() => {
      const summary = this.store.summary();
      this.pageHeader.set({
        title: 'Adhérents',
        subtitle: summary
          ? `${summary.total} inscrits · ${summary.upToDate} à jour · ${summary.expiringSoon} expirations < 30j`
          : 'Chargement…',
        breadcrumb: ['Espace', 'Adhérents'],
        activeNavId: 'adh',
      });
    });

    effect(() => {
      const visible = this.visibleClients();
      const current = this.selectedId();
      if (visible.length === 0) {
        if (current !== null) this.selectedId.set(null);
        return;
      }
      if (current === null || !visible.some((row) => row.id === current)) {
        this.selectedId.set(visible[0].id);
      }
    });

    effect(() => {
      const id = this.selectedId();
      if (id === null) {
        this.detail.set(null);
        return;
      }
      void this.loadDetail(id);
    });
  }

  ngOnInit(): void {
    void this.store.load();
  }

  protected select(id: number): void {
    this.selectedId.set(id);
    this.sheetOpen.set(true);
  }

  private async loadDetail(id: number): Promise<void> {
    this.detailLoading.set(true);
    const detail = await this.store.getDetail(id);
    if (this.selectedId() === id) this.detail.set(detail);
    this.detailLoading.set(false);
  }

  protected readonly icSearch = LucideSearch;
  protected readonly icFilter = LucideFunnel;
  protected readonly icDownload = LucideDownload;
  protected readonly icUpload = LucideUpload;
  protected readonly icPlus = LucidePlus;
  protected readonly icMore = LucideEllipsis;
  protected readonly icChevRight = LucideChevronRight;
  protected readonly icCheck = LucideCheck;
  protected readonly icMail = LucideMail;
  protected readonly icEdit = LucidePencil;
  protected readonly icAlert = LucideTriangleAlert;

  protected readonly filterTabs = computed(() => {
    const summary = this.store.summary();
    return [
      `Tous · ${summary?.total ?? 0}`,
      `À jour · ${summary?.upToDate ?? 0}`,
      `Expirés · ${summary?.expired ?? 0}`,
      `Expirant dans < 30j · ${summary?.expiringSoon ?? 0}`,
      `Non-adhérents · ${summary?.withoutSubscription ?? 0}`,
    ];
  });

  protected readonly visibleClients = computed<readonly ClientRow[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.activeFilter();

    const matching = this.store.clients().filter((row) => {
      if (filter === 1 && row.status !== 'active') return false;
      if (filter === 2 && row.status !== 'expired') return false;
      if (filter === 3 && !expiringSoon(row)) return false;
      if (filter === 4 && row.status !== 'none') return false;
      if (query === '') return true;
      return (
        (row.name ?? '').toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query) ||
        row.membershipNumber.toLowerCase().includes(query)
      );
    });

    const dir = this.sortDir() === 'asc' ? 1 : -1;
    return [...matching].sort((a, b) => dir * this.compare(a, b));
  });

  /**
   * Les fiches sans date d'expiration restent en queue **dans les deux sens** :
   * elles ne sont pas « les plus lointaines », elles n'ont pas de date. D'où le
   * signe inversé en `desc` — l'appelant multiplie déjà le résultat par le sens,
   * et ces deux-là doivent en sortir indemnes.
   */
  private compare(a: ClientRow, b: ClientRow): number {
    switch (this.sortKey()) {
      case 'expiresAt': {
        if (a.expiresAt === b.expiresAt) return 0;
        if (a.expiresAt === null) return this.sortDir() === 'asc' ? 1 : -1;
        if (b.expiresAt === null) return this.sortDir() === 'asc' ? -1 : 1;
        return a.expiresAt < b.expiresAt ? -1 : 1;
      }
      case 'status': {
        const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
        return rank !== 0 ? rank : this.compareNames(a, b);
      }
      default:
        return this.compareNames(a, b);
    }
  }

  private compareNames(a: ClientRow, b: ClientRow): number {
    return this.displayName(a).localeCompare(this.displayName(b), 'fr', { sensitivity: 'base' });
  }

  protected readonly selected = computed<ClientRow | null>(() => {
    const id = this.selectedId();
    return this.store.clients().find((row) => row.id === id) ?? null;
  });

  protected readonly infoRows = computed<readonly InfoRow[]>(() => {
    const detail = this.detail();
    if (!detail) return [];
    return [
      { k: 'Email', v: detail.email },
      { k: 'Promotion', v: detail.promotion ?? '—' },
      { k: 'École', v: detail.school ?? '—' },
      { k: 'Inscription', v: this.formatDate(detail.registeredAt) },
      { k: 'Expire le', v: detail.expiresAt ? this.formatDate(detail.expiresAt) : '—' },
    ];
  });

  protected readonly stats = computed<readonly StatTile[]>(() => {
    const detail = this.detail();
    return [
      { k: 'Cotisations', v: String(detail?.subscriptions.length ?? 0) },
      { k: 'Précommandes', v: String(detail?.preOrderCount ?? 0) },
      { k: 'Dépensé', v: `${formatCents(detail?.spentCents ?? 0)} €` },
    ];
  });

  protected readonly displayName = (row: ClientRow | ClientDetail): string => row.name ?? row.email;

  protected statusLabel(status: MembershipStatus): string {
    return STATUS_LABELS[status];
  }

  protected statusKind(status: MembershipStatus): BadgeKind {
    if (status === 'active') return 'ok';
    if (status === 'expired') return 'danger';
    return 'ghost';
  }

  protected expClass(status: MembershipStatus): string {
    return status === 'expired' ? 'text-danger' : 'text-text-2';
  }

  protected formatDate(iso: string): string {
    const date = parseApiDate(iso);
    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  protected formatAmount(amount: number | null): string {
    return amount === null ? '—' : `${amount.toFixed(2).replace('.', ',')} €`;
  }

  protected verifyInCaisse(): void {
    this.router.navigate(['/caisse']);
  }

  protected openSortMenu(event: MouseEvent): void {
    const current = this.sortKey();
    this.dropdown.toggle({
      anchor: event.currentTarget as HTMLElement,
      placement: 'bottom-end',
      width: 200,
      header: 'Trier par',
      items: (Object.keys(SORT_LABELS) as SortKey[]).map((key) => ({
        type: 'action' as const,
        label: SORT_LABELS[key],
        trailing: key === current ? (this.sortDir() === 'asc' ? '↑' : '↓') : undefined,
        onClick: () => this.applySort(key),
      })),
    });
  }

  /** Rechoisir le critère actif inverse le sens : c'est le seul geste qui le
   *  change, et il évite un second menu pour deux valeurs. */
  private applySort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    this.sortKey.set(key);
    this.sortDir.set('asc');
  }

  protected readonly sortLabel = computed(
    () => `${SORT_LABELS[this.sortKey()]} ${this.sortDir() === 'asc' ? '↑' : '↓'}`,
  );

  protected openEdit(): void {
    const client = this.detail();
    if (client === null) return;
    this.modal.open({
      type: 'component',
      component: ClientEditModal,
      inputs: { client, onSaved: () => void this.loadDetail(client.id) },
    });
  }

  protected openSubscription(): void {
    const client = this.selected();
    if (client === null) return;
    this.modal.open({
      type: 'component',
      component: SubscriptionCreateModal,
      inputs: { client, onSaved: () => void this.loadDetail(client.id) },
    });
  }
}

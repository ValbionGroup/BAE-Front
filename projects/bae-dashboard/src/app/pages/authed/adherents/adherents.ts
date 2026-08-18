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
import { Btn, Badge, BadgeKind, Avatar, Input, Skeleton } from '@bae/ui';
import type { ClientDetail, ClientRow, MembershipStatus } from './adherents.types';

interface InfoRow {
  readonly k: string;
  readonly v: string;
  /** Renseigné quand la valeur n'existe pas encore en base, pour le dire. */
  readonly missing?: string;
}

interface StatTile {
  readonly k: string;
  readonly v: string;
  readonly missing?: string;
}

const STATUS_LABELS: Record<MembershipStatus, string> = {
  active: 'À jour',
  expired: 'Expirée',
  none: 'Non-adhérent',
};

@Component({
  selector: 'bfd-adherents',
  imports: [Btn, Badge, Avatar, Input, Skeleton, LucideDynamicIcon],
  templateUrl: './adherents.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Sans `block h-full`, le composant n'a pas de hauteur propre : le `h-full`
  // du gabarit ne résout rien et c'est l'app-shell qui défile en écrasant la
  // page. Piège déjà tombé sur Stocks puis Logistique.
  host: { class: 'block h-full' },
})
export class Adherents implements OnInit {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly router = inject(Router);
  protected readonly store = inject(ClientsStore);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  protected readonly searchQuery = signal('');
  protected readonly activeFilter = signal(0);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly detail = signal<ClientDetail | null>(null);
  protected readonly detailLoading = signal(false);

  constructor() {
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });

    // Le sous-titre annonçait « 342 inscrits » en dur ; il suit maintenant les
    // compteurs servis par `/clients/summary`.
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

    // La première ligne visible est sélectionnée d'office, comme sur la maquette.
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

  private async loadDetail(id: number): Promise<void> {
    this.detailLoading.set(true);
    const detail = await this.store.getDetail(id);
    // La sélection a pu changer pendant l'appel : n'écraser que si elle tient.
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
      // La maquette disait « Externes », qui décrivait une provenance. Ce sont
      // des comptes créés par EirbConnect qui n'ont simplement pas d'adhésion —
      // le même mot que le badge de la ligne, « Non-adhérent ».
      `Non-adhérents · ${summary?.withoutSubscription ?? 0}`,
    ];
  });

  /** Les onglets filtrent réellement : avant, ils ne changeaient que le style. */
  protected readonly visibleClients = computed<readonly ClientRow[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.activeFilter();

    return this.store.clients().filter((row) => {
      if (filter === 1 && row.status !== 'active') return false;
      if (filter === 2 && row.status !== 'expired') return false;
      if (filter === 3 && row.status !== 'none') return false;
      if (query === '') return true;
      return (
        (row.name ?? '').toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query) ||
        row.membershipNumber.toLowerCase().includes(query)
      );
    });
  });

  protected readonly selected = computed<ClientRow | null>(() => {
    const id = this.selectedId();
    return this.store.clients().find((row) => row.id === id) ?? null;
  });

  protected readonly infoRows = computed<readonly InfoRow[]>(() => {
    const detail = this.detail();
    if (!detail) return [];
    return [
      { k: 'Email', v: detail.email },
      { k: 'Téléphone', v: detail.phone ?? '—' },
      { k: 'Promotion', v: detail.promotion ?? '—' },
      { k: 'École', v: detail.school ?? '—' },
      { k: 'Inscription', v: this.formatDate(detail.registeredAt) },
      { k: 'Expire le', v: detail.expiresAt ? this.formatDate(detail.expiresAt) : '—' },
    ];
  });

  /**
   * Trois des quatre tuiles de la maquette n'ont aucune source : `transactions`
   * ne porte aucun lien vers une personne, et le rattachement d'une commande à
   * son acheteur arrive avec le lot caisse. Elles le disent plutôt que
   * d'afficher un nombre plausible.
   */
  protected readonly stats = computed<readonly StatTile[]>(() => {
    const detail = this.detail();
    const unavailable = 'Disponible quand les commandes seront rattachées à leur acheteur.';
    return [
      { k: 'Cotisations', v: String(detail?.subscriptions.length ?? 0) },
      { k: 'Précommandes', v: '—', missing: unavailable },
      { k: 'Dépensé', v: '—', missing: unavailable },
      { k: 'Solde courant', v: '—', missing: unavailable },
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
    const date = new Date(iso);
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
}

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
  LucideDownload,
  LucideDynamicIcon,
  LucideEllipsis,
  LucidePlus,
  LucideSearch,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { TeamStore } from '#core/store/team.store';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';
import { Card } from '#shared/components/ui/card/card';
import { Avatar } from '#shared/components/ui/avatar/avatar';
import { Input } from '#shared/components/ui/input/input';
import { Skeleton } from '#shared/components/ui/skeleton/skeleton';
import { toAuditEntries, toMemberRows, toPermsMatrix } from './equipe.mappers';
import type { AuditEntry, Invitation, PermState } from './equipe.types';

@Component({
  selector: 'bfd-equipe',
  imports: [Btn, Badge, Card, Avatar, Input, Skeleton, LucideDynamicIcon],
  templateUrl: './equipe.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Equipe implements OnInit {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');
  protected readonly store = inject(TeamStore);

  /** Reference instant for every relative label; refreshed on each load. */
  private readonly now = signal(Date.now());

  constructor() {
    this.pageHeader.set({
      title: 'Équipe BAE',
      subtitle: 'Chargement…',
      breadcrumb: ['Paramètres', 'Équipe BAE'],
      activeNavId: 'team',
    });
    // `set()` clears the action template, so the subtitle refresh and the action
    // re-push have to live in the same effect, in that order.
    effect(() => {
      this.pageHeader.set({
        title: 'Équipe BAE',
        subtitle: this.subtitle(),
        breadcrumb: ['Paramètres', 'Équipe BAE'],
        activeNavId: 'team',
      });
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  ngOnInit(): void {
    this.now.set(Date.now());
    void this.store.load();
  }

  protected readonly icDownload = LucideDownload;
  protected readonly icPlus = LucidePlus;
  protected readonly icSearch = LucideSearch;
  protected readonly icMore = LucideEllipsis;

  protected readonly loading = this.store.loading;
  protected readonly loadError = this.store.loadError;
  protected readonly errors = this.store.errors;

  protected readonly tabs = ['Membres', 'Rôles & permissions', 'Audit · activité', 'Invitations'];
  protected readonly activeTab = signal(0);

  protected readonly searchQuery = signal('');

  private readonly allMembers = computed(() =>
    toMemberRows(this.store.members(), this.store.logs(), this.now()),
  );

  protected readonly team = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.allMembers();
    return this.allMembers().filter(
      (m) => m.nom.toLowerCase().includes(q) || (m.role?.toLowerCase().includes(q) ?? false),
    );
  });

  protected readonly recentlyActiveCount = computed(
    () => this.allMembers().filter((m) => m.recentlyActive).length,
  );

  protected readonly perms = computed(() =>
    toPermsMatrix(this.store.roles(), this.store.permissions(), this.store.members()),
  );

  protected readonly audit = computed(() =>
    toAuditEntries(this.store.logs(), this.store.members(), this.now()),
  );

  private readonly subtitle = computed(() => {
    if (this.loading() === 'loading' || this.loading() === 'init') return 'Chargement…';
    if (this.loading() === 'error') return 'Données indisponibles';
    const members = this.store.members().length;
    const roles = this.store.roles().length;
    const permissions = this.store.permissions().length;
    return `${members} membre${members > 1 ? 's' : ''} · ${roles} rôle${roles > 1 ? 's' : ''} · ${permissions} permission${permissions > 1 ? 's' : ''}`;
  });

  /**
   * MOCK — the backend has no `invitations` table and no invitation endpoint.
   * Per project rule (front feature without a backend ⇒ the backend is incomplete),
   * the panel stays in place with these placeholder rows until `GET /invitations` exists.
   */
  protected readonly invitations: readonly Invitation[] = [
    { mail: 'c.guerin@etu.ec.fr', role: 'Coordo (suppléant)', exp: '14 fév.' },
    { mail: 'r.albert@etu.ec.fr', role: 'Membre actif', exp: '14 fév.' },
  ];

  protected readonly skeletonRows = [0, 1, 2, 3, 4];

  protected onSearch(value: string): void {
    this.searchQuery.set(value);
  }

  /**
   * Role names come straight from the `roles` table (`Finance`, `Logistics`, …) and the API
   * defines no privilege hierarchy, so colouring by name would be an invention: every role
   * gets the neutral badge, and "no role" gets the ghost variant.
   */
  protected roleKind(role: string | null): BadgeKind {
    return role === null ? 'ghost' : 'neutral';
  }

  protected permClass(p: PermState): { wrap: string; label: string; title: string } {
    if (p === 'granted') return { wrap: 'bg-ok-soft text-ok', label: '✓', title: 'Accordée' };
    return {
      wrap: 'border border-dashed border-border text-faint',
      label: '—',
      title: 'Aucun accès',
    };
  }

  protected auditIconClass(c: AuditEntry['c']): string {
    if (c === 'warn') return 'bg-warn-soft text-warn';
    if (c === 'ok') return 'bg-ok-soft text-ok';
    if (c === 'danger') return 'bg-danger-soft text-danger';
    if (c === 'blue') return 'bg-blue-soft text-blue';
    return 'bg-surface-2 text-muted';
  }
}

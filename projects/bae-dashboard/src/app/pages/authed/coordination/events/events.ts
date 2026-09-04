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
  LucideCalendar,
  LucideDownload,
  LucideDynamicIcon,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { ModalService } from '#shared/components/modal/modal.service';
import { CoordinationNewModal } from '#shared/components/modal/coordination-new-modal/coordination-new-modal';
import { CoordinationDeleteModal } from '#shared/components/modal/coordination-delete-modal/coordination-delete-modal';
import { type ApiEvent } from '#core/services/coordination/coordination-service';
import { CoordinationStore } from '#core/store/coordination.store';
import { Badge, Input, DetailSheet } from '@bae/ui';
import { CoordinationEventDetail } from './event-detail/event-detail';
import type { CoordinationEvent, TabKey } from './events.types';

import { PageAction, PageActions } from '#shared/components/page-actions/page-actions';

@Component({
  selector: 'bfd-coordination-events',
  imports: [Badge, Input, LucideDynamicIcon, CoordinationEventDetail, PageActions, DetailSheet],
  templateUrl: './events.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Sans hauteur sur l'hôte, le `h-full` du gabarit ne résout pas : la grille n'a plus de
  // hauteur définie, sa ligne `minmax(0,1fr)` ne plafonne rien et le panneau déborde.
  host: { class: 'block h-full' },
})
export class CoordinationEvents implements OnInit {
  protected readonly pageActions = computed<readonly PageAction[]>(() => [
    { label: 'Calendrier', icon: this.icCalendar, kind: 'ghost', run: () => {} },
    { label: 'Exporter', icon: this.icDownload, kind: 'ghost', run: () => {} },
    {
      label: 'Nouvelle soirée',
      icon: this.icPlus,
      kind: 'primary',
      primary: true,
      run: () => this.openNew(),
    },
  ]);

  private readonly pageHeader = inject(PageHeaderService);
  private readonly modals = inject(ModalService);
  private readonly store = inject(CoordinationStore);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  constructor() {
    this.pageHeader.set({
      title: 'Coordination',
      subtitle: 'Soirées · création & édition',
      breadcrumb: ['Préparation', 'Coordination', 'Soirées'],
      activeNavId: 'coord',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  ngOnInit(): void {
    void this.store.load().then(() => {
      if (this.selectedId() !== null) return;
      const list = this.store.events();
      const nextUpcoming = list.find((e) => e.status !== 'past');
      this.selectedId.set(nextUpcoming?.id ?? list.at(-1)?.id ?? null);
    });
  }

  protected readonly icCalendar = LucideCalendar;
  protected readonly icDownload = LucideDownload;
  protected readonly icPlus = LucidePlus;
  protected readonly icSearch = LucideSearch;
  protected readonly icEdit = LucidePencil;
  protected readonly icTrash = LucideTrash2;

  protected readonly loading = this.store.loading;
  protected readonly loadError = this.store.loadError;

  protected readonly activeTab = signal<TabKey>('upcoming');
  protected readonly selectedId = signal<number | null>(null);
  /** Distinct de `selectedId` : la soirée présélectionnée au chargement remplit la colonne
   *  de droite en desktop sans déployer la feuille mobile. */
  protected readonly sheetOpen = signal(false);
  protected readonly searchQuery = signal<string>('');

  protected readonly tabs = computed(() => {
    const all = this.store.events();
    const upcoming = all.filter((e) => e.status !== 'past').length;
    const past = all.filter((e) => e.status === 'past').length;
    return [
      { key: 'upcoming' as TabKey, label: 'À venir', count: upcoming },
      { key: 'past' as TabKey, label: 'Passées', count: past },
    ];
  });

  protected readonly visibleEvents = computed<readonly CoordinationEvent[]>(() => {
    const tab = this.activeTab();
    const q = this.searchQuery().trim().toLowerCase();
    return this.store
      .events()
      .filter((e) => (tab === 'upcoming' ? e.status !== 'past' : e.status === 'past'))
      .filter((e) => !q || e.name.toLowerCase().includes(q));
  });

  protected readonly selectedEvent = computed(
    () => this.store.events().find((e) => e.id === this.selectedId()) ?? null,
  );

  protected openNew(): void {
    this.modals.open({
      type: 'component',
      component: CoordinationNewModal,
      inputs: { onCreated: (ev: ApiEvent) => this.select(ev.id) },
    });
  }

  protected openDelete(eventId: number): void {
    const ev = this.store.events().find((e) => e.id === eventId);
    this.modals.open({
      type: 'component',
      component: CoordinationDeleteModal,
      inputs: {
        eventName: ev?.name ?? 'cette soirée',
        eventId,
        onDeleted: () => {
          if (this.selectedId() === eventId) this.selectedId.set(null);
        },
      },
    });
  }

  protected select(id: number): void {
    this.selectedId.set(id);
    this.sheetOpen.set(true);
  }

  protected deselect(): void {
    this.selectedId.set(null);
    this.sheetOpen.set(false);
  }

  protected setTab(key: TabKey): void {
    this.activeTab.set(key);
  }

  protected setSearch(q: string): void {
    this.searchQuery.set(q);
  }

  protected rowAccent(e: CoordinationEvent): { bg: string; text: string } {
    switch (e.status) {
      case 'preparing':
        return { bg: 'bg-red-soft', text: 'text-red' };
      case 'past':
        return { bg: 'bg-ok-soft', text: 'text-ok' };
      case 'draft':
        return { bg: 'bg-surface-3', text: 'text-muted' };
      default:
        return { bg: 'bg-blue-soft', text: 'text-blue' };
    }
  }
}

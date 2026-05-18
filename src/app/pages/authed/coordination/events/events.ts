import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
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
import {
  CoordinationService,
  type ApiAssignment,
  type ApiEvent,
  type ApiEventJob,
} from '#core/services/coordination/coordination-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Input } from '#shared/components/ui/input/input';
import { CoordinationEventDetail } from './event-detail/event-detail';
import type { CoordinationEvent, EventStatus, TabKey } from './events.types';

@Component({
  selector: 'bfd-coordination-events',
  imports: [Btn, Badge, Input, LucideDynamicIcon, CoordinationEventDetail],
  templateUrl: './events.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoordinationEvents implements OnInit {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly modals = inject(ModalService);
  private readonly router = inject(Router);
  private readonly svc = inject(CoordinationService);
  private readonly destroyRef = inject(DestroyRef);
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
    this.svc
      .loadAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (raw) => {
          const list = raw.events
            .map((e) => this.toCoordinationEvent(e, raw.assignments, raw.eventJobs))
            .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

          this.events.set(list);
          this.loading.set(false);

          if (this.selectedId() === null) {
            const nextUpcoming = list.find((e) => e.status !== 'past');
            this.selectedId.set(nextUpcoming?.id ?? list.at(-1)?.id ?? null);
          }
        },
        error: () => {
          this.loadError.set('Impossible de charger les soirées.');
          this.loading.set(false);
        },
      });
  }

  protected readonly icCalendar = LucideCalendar;
  protected readonly icDownload = LucideDownload;
  protected readonly icPlus = LucidePlus;
  protected readonly icSearch = LucideSearch;
  protected readonly icEdit = LucidePencil;
  protected readonly icTrash = LucideTrash2;

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly events = signal<CoordinationEvent[]>([]);
  protected readonly activeTab = signal<TabKey>('upcoming');
  protected readonly selectedId = signal<number | null>(null);

  protected readonly tabs = computed(() => {
    const all = this.events();
    const upcoming = all.filter((e) => e.status !== 'past').length;
    const past = all.filter((e) => e.status === 'past').length;
    return [
      { key: 'upcoming' as TabKey, label: 'À venir', count: upcoming },
      { key: 'past' as TabKey, label: 'Passées', count: past },
    ];
  });

  protected readonly visibleEvents = computed<readonly CoordinationEvent[]>(() => {
    const tab = this.activeTab();
    return this.events().filter((e) =>
      tab === 'upcoming' ? e.status !== 'past' : e.status === 'past',
    );
  });

  protected readonly selectedEvent = computed(
    () => this.events().find((e) => e.id === this.selectedId()) ?? null,
  );

  protected openNew(): void {
    this.modals.open({
      type: 'component',
      component: CoordinationNewModal,
      inputs: { onCreated: (ev: ApiEvent) => this.onEventCreated(ev) },
    });
  }

  protected openDelete(eventId: number): void {
    const ev = this.events().find((e) => e.id === eventId);
    this.modals.open({
      type: 'component',
      component: CoordinationDeleteModal,
      inputs: { eventName: ev?.name ?? 'cette soirée' },
    });
  }

  protected select(id: number): void {
    this.selectedId.set(id);
  }

  protected deselect(): void {
    this.selectedId.set(null);
  }

  protected setTab(key: TabKey): void {
    this.activeTab.set(key);
  }

  protected navigate(id: number): void {
    this.router.navigate(['/coordination', id]);
  }

  protected onEventSaved(ev: ApiEvent): void {
    const dt = new Date(ev.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPast = dt < today;
    this.events.update((list) =>
      list.map((e) => {
        if (e.id !== ev.id) return e;
        return {
          ...e,
          name: ev.name,
          rawDate: ev.date,
          date: dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
          status: (isPast ? 'past' : e.status) as EventStatus,
          statusLabel: isPast ? 'Passée' : e.statusLabel,
          statusKind: isPast ? 'ok' : e.statusKind,
          duration: ev.duration,
        };
      }),
    );
  }

  private onEventCreated(ev: ApiEvent): void {
    const newEvent = this.toCoordinationEvent(ev, [], []);
    this.events.update((list) =>
      [...list, newEvent].sort(
        (a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime(),
      ),
    );
    this.selectedId.set(ev.id);
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

  private toCoordinationEvent(
    apiEvent: ApiEvent,
    assignments: ApiAssignment[],
    eventJobs: ApiEventJob[],
  ): CoordinationEvent {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dt = new Date(apiEvent.date);
    const isPast = dt < today;

    const assignedCount = new Set(
      assignments.filter((a) => a.eventId === apiEvent.id).map((a) => a.memberId),
    ).size;
    const maxMembers = eventJobs
      .filter((ej) => ej.eventId === apiEvent.id)
      .reduce((sum, ej) => sum + ej.count, 0);

    const status: EventStatus = isPast ? 'past' : 'preparing';

    return {
      id: apiEvent.id,
      name: apiEvent.name,
      date: dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
      rawDate: apiEvent.date,
      status,
      statusLabel: isPast ? 'Passée' : 'En préparation',
      statusKind: isPast ? 'ok' : 'warn',
      members: assignedCount,
      maxMembers,
      recipes: 0,
      duration: apiEvent.duration,
    };
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  LucideCalendar,
  LucideCheck,
  LucideClock,
  LucideDownload,
  LucideDynamicIcon,
  LucideFlag,
  LucidePencil,
  LucideSettings,
  LucideX,
} from '@lucide/angular';
import { Store } from '@ngrx/store';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn, Badge, BadgeKind, Card, Skeleton, ToastService } from '@bae/ui';
import { EventDetail, Presence } from '#core/models/event.model';
import { EventsStore } from '#core/store/events.store';
import {
  MemberAssignmentsStore,
  type MemberAssignment,
} from '#core/store/member-assignments.store';
import { selectMember } from '#core/store/auth/auth.selector';
import {
  presenceErrorView,
  presenceLockExplanation,
  type PresenceErrorView,
} from '#shared/utils/presence-lock';
import { formatPointsDelta } from '#shared/utils/points-delta';
import { startOfDay } from 'date-fns';

// Re-exported: this screen's spec imports the two helpers from here, and so
// does `home.ts` — both pages just consume the shared, single-source wording
// instead of each keeping its own copy.
export { presenceErrorView, presenceLockExplanation, type PresenceErrorView };

interface ScoreRow {
  readonly k: string;
  readonly v: number;
  readonly sub: string;
}

/**
 * One poste the member holds on a soirée. Re-exported from the store so the
 * template and its spec name a single type — the page adds no field of its own.
 */
export type MemberPoste = MemberAssignment;

const MONTHS_SHORT_FR = [
  'jan.',
  'fév.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
] as const;

@Component({
  selector: 'bfd-my-presences',
  imports: [Btn, Badge, Card, Skeleton, LucideDynamicIcon],
  templateUrl: './my-presences.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyPresences implements OnInit {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly store = inject(Store);
  private readonly events = inject(EventsStore);
  private readonly assignments = inject(MemberAssignmentsStore);
  private readonly toast = inject(ToastService);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  protected readonly skeletonRows = Array.from({ length: 3 });

  protected readonly icDownload = LucideDownload;
  protected readonly icSettings = LucideSettings;
  protected readonly icCheck = LucideCheck;
  protected readonly icClock = LucideClock;
  protected readonly icX = LucideX;
  protected readonly icFlag = LucideFlag;
  protected readonly icEdit = LucidePencil;
  protected readonly icCalendar = LucideCalendar;

  protected readonly Presence = Presence;

  private readonly memberData = this.store.selectSignal(selectMember);

  protected readonly memberName = computed<string>(() => {
    const m = this.memberData();
    if (!m) return '';
    return `${m.firstName} ${m.lastName}`.trim();
  });

  protected readonly loading = computed(() => {
    const status = this.events.loading();
    return status === 'init' || status === 'loading';
  });

  private readonly allSorted = computed<readonly EventDetail[]>(() =>
    [...this.events.allEvents()].sort((a, b) => a.date.getTime() - b.date.getTime()),
  );

  protected readonly upcomingEvents = computed<readonly EventDetail[]>(() => {
    const today = startOfDay(new Date());
    return this.allSorted().filter((e) => e.date.getTime() >= today.getTime());
  });

  protected readonly pastEvents = computed<readonly EventDetail[]>(() => {
    const today = startOfDay(new Date());
    return [...this.allSorted()].reverse().filter((e) => e.date.getTime() < today.getTime());
  });

  protected readonly upcomingCount = computed(() => this.upcomingEvents().length);
  protected readonly pastCount = computed(() => this.pastEvents().length);

  protected readonly subtitle = computed(() => {
    if (this.loading()) return 'Chargement…';
    return `${this.upcomingCount()} soirée·s à venir · ${this.pastCount()} passée·s`;
  });

  private readonly allPresencesLoaded = computed(() =>
    this.pastEvents().every((e) => e.memberPresenceStatus === 'loaded'),
  );

  protected readonly engagementScore = computed(() => {
    const past = this.pastEvents();
    if (past.length === 0) return 0;
    const present = past.filter((e) => e.memberPresence === Presence.PRESENT).length;
    return Math.round((present / past.length) * 100);
  });

  protected readonly engagementLoading = computed(
    () => this.loading() || !this.allPresencesLoaded(),
  );

  protected readonly scoreRows = computed<readonly ScoreRow[]>(() => {
    const past = this.pastEvents();
    const total = past.length;
    const present = past.filter((e) => e.memberPresence === Presence.PRESENT).length;
    const presenceRate = total === 0 ? 0 : Math.round((present / total) * 100);
    return [];
  });

  protected readonly notifReminder = signal(true);

  constructor() {
    this.pageHeader.set({
      title: 'Mes présences',
      subtitle: 'Saison en cours',
      breadcrumb: ['Espace', 'Présences', 'Mes présences'],
      activeNavId: 'pres',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
    effect(() => {
      const subtitle = this.subtitle();
      const member = this.memberName();
      this.pageHeader.set({
        title: 'Mes présences',
        subtitle,
        breadcrumb: member ? ['Espace', 'Présences', member] : ['Espace', 'Présences'],
        activeNavId: 'pres',
      });
    });
    effect(() => {
      const all = [...this.upcomingEvents(), ...this.pastEvents()];
      const toFetch = all.filter((e) => e.memberPresenceStatus === 'init').map((e) => e.id);
      if (toFetch.length === 0) return;
      untracked(() => {
        for (const id of toFetch) void this.events.loadMemberPresence(id);
      });
    });
  }

  ngOnInit(): void {
    void this.events.load();
    // Same single round trip the accueil already uses; the store is shared, so
    // arriving from the accueil costs nothing.
    void this.assignments.load();
  }

  protected isPresenceLoading(event: EventDetail): boolean {
    const status = event.memberPresenceStatus;
    return status === 'init' || status === 'loading' || status === 'refreshing';
  }

  protected daysFromToday(date: Date): number {
    const today = startOfDay(new Date());
    const target = startOfDay(date);
    return Math.round((target.getTime() - today.getTime()) / 86_400_000);
  }

  protected dateDay(date: Date): string {
    return String(date.getDate()).padStart(2, '0');
  }

  protected dateMonth(date: Date): string {
    return MONTHS_SHORT_FR[date.getMonth()];
  }

  /**
   * The postes really held on this soirée — at most one per moment (D1),
   * ordered préparation → soirée → nettoyage. Empty when the member holds none.
   */
  protected postesFor(event: EventDetail): readonly MemberPoste[] {
    return this.assignments.assignmentsFor(event.id);
  }

  /**
   * The soirée's movement of priority credit: the sum of the assignments'
   * `pointsDelta` (D5). Legitimately negative — a member served on their first
   * choice everywhere SPENDS priority.
   */
  protected creditFor(event: EventDetail): number {
    return this.assignments.creditFor(event.id);
  }

  /**
   * Holding no poste ("—") is not the same thing as holding one that moved
   * nothing ("0 pt"), and a negative total is normal information, not something
   * to hide behind a dash.
   */
  protected creditLabel(event: EventDetail): string {
    if (this.postesFor(event).length === 0) return '—';
    return formatPointsDelta(this.creditFor(event));
  }

  protected creditClass(event: EventDetail): string {
    if (this.postesFor(event).length === 0) return 'text-muted';
    const credit = this.creditFor(event);
    if (credit > 0) return 'text-ok';
    return credit < 0 ? 'text-warn' : 'text-muted';
  }

  /**
   * D8/D9: holding any poste on the soirée blocks declaring oneself absent —
   * the whole soirée, not the moment. Going back to present is never blocked.
   */
  protected isPresenceLocked(event: EventDetail): boolean {
    return this.postesFor(event).length > 0;
  }

  protected lockDescriptionId(event: EventDetail): string {
    return `presence-lock-${event.id}`;
  }

  protected lockExplanation(event: EventDetail): string {
    return presenceLockExplanation(this.postesFor(event));
  }

  protected async respondPresent(event: EventDetail): Promise<void> {
    await this.submitPresence(event, Presence.PRESENT);
  }

  protected async respondAbsent(event: EventDetail): Promise<void> {
    // The button is disabled, but a keyboard or a stale click must not spend a
    // round trip on a refusal this screen already knows about.
    if (this.isPresenceLocked(event)) return;
    await this.submitPresence(event, Presence.ABSENT);
  }

  private async submitPresence(event: EventDetail, presence: Presence): Promise<void> {
    const result = await this.events.setMemberPresence(event.id, presence);
    if (result.ok) return;

    const view = presenceErrorView(result.error);
    this.toast.show({ type: 'error', title: view.title, message: view.message });

    // The refusal is proof this page's assignments are stale — another tab, or a
    // coordinator staffing the member since the page loaded. Re-read so the lock
    // and the poste behind it become visible instead of leaving a button that
    // looks usable and is not.
    void this.assignments.refresh();
  }

  protected pastBadgeKind(event: EventDetail): BadgeKind {
    return event.memberPresence === Presence.PRESENT ? 'ok' : 'red';
  }

  protected pastStatusLabel(event: EventDetail): string {
    return event.memberPresence === Presence.PRESENT ? 'Venu·e' : 'Absent·e';
  }

  protected scoreColor(v: number): string {
    if (v >= 80) return 'bg-ok';
    if (v >= 60) return 'bg-blue';
    return 'bg-warn';
  }
}

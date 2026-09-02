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
import { Router } from '@angular/router';
import {
  LucideArrowRight,
  LucideCalendar,
  LucideCheck,
  LucideChevronRight,
  LucideDynamicIcon,
  LucidePlus,
  LucideQrCode,
  LucideSettings,
  LucideUsers,
  LucideZap,
} from '@lucide/angular';
import { Store } from '@ngrx/store';
import { selectMember } from '#core/store/auth/auth.selector';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { RouterLink } from '@angular/router';
import { AppRoutes } from '#app/app.routes';
import { Btn, Badge, Card, Avatar, Skeleton, ToastService, formatCents } from '@bae/ui';
import { StatsStore } from '#core/store/home-data/stats.store';
import { EncaissementsStore } from '#core/store/home-data/encaissements.store';
import { CHART_SERIES } from '#core/store/home-data/models';
import { QUICK_ACTION_ROUTES, QuickActionsStore } from '#core/store/home-data/quick-actions.store';
import { ActivityFeedStore } from '#core/store/home-data/activity-feed.store';
import { RoleAssignmentStore } from '#core/store/home-data/role-assignment.store';
import { AgendaStore } from '#core/store/home-data/agenda.store';
import { AlertsStore } from '#core/store/home-data/alerts.store';
import { NextEventStore } from '#core/store/home-data/next-event.store';
import { EventsStore } from '#core/store/events.store';
import { StocksStore } from '#core/store/stocks.store';
import {
  MemberAssignmentsStore,
  type MemberAssignment,
} from '#core/store/member-assignments.store';
import { EventDetail, Presence } from '#core/models/event.model';
import {
  presenceErrorView,
  presenceLockExplanation,
  type PresenceErrorView,
} from '#shared/utils/presence-lock';
import { startOfDay } from 'date-fns';

export { presenceErrorView, presenceLockExplanation, type PresenceErrorView };

const PERIOD_LIMITS: readonly number[] = [1, 3, 6, 12];

@Component({
  selector: 'bfd-home',
  imports: [Btn, Badge, Card, Avatar, Skeleton, RouterLink, LucideDynamicIcon],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private readonly store = inject(Store);
  private readonly events = inject(EventsStore);
  private readonly stocks = inject(StocksStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly currentDate = new Date();

  protected readonly stats = inject(StatsStore);
  protected readonly nextEvent = inject(NextEventStore);
  protected readonly agenda = inject(AgendaStore);
  protected readonly alerts = inject(AlertsStore);
  protected readonly encaissements = inject(EncaissementsStore);
  protected readonly role = inject(RoleAssignmentStore);
  protected readonly quickActions = inject(QuickActionsStore);
  protected readonly activity = inject(ActivityFeedStore);

  private readonly memberAssignments = inject(MemberAssignmentsStore);

  protected readonly Presence = Presence;

  protected readonly preferencesLink = `/${AppRoutes.parametresPreferences}`;

  protected rankLabel(rank: number): string {
    return rank === 1 ? '1er choix' : `${rank}e choix`;
  }

  protected readonly responseEvent = computed<EventDetail | undefined>(() => {
    const today = startOfDay(new Date()).getTime();
    return [...this.events.allEvents()]
      .filter((e) => e.date.getTime() >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  });

  protected readonly responseLoading = computed(() => {
    const e = this.responseEvent();
    if (!e) return false;
    const status = e.memberPresenceStatus;
    return status === 'init' || status === 'loading' || status === 'refreshing';
  });

  protected readonly nextEventAssignees = computed<number | null>(() => {
    const event = this.responseEvent();
    return event?.assigneeCount ?? null;
  });

  protected readonly heldPostes = computed<readonly MemberAssignment[]>(() => {
    const event = this.responseEvent();
    if (!event) return [];
    return this.memberAssignments.assignmentsFor(event.id);
  });

  protected readonly presenceLocked = computed(() => this.heldPostes().length > 0);

  protected readonly presenceLockId = computed<string | null>(() => {
    const event = this.responseEvent();
    return event ? `presence-lock-${event.id}` : null;
  });

  protected readonly presenceLockExplanationText = computed(() =>
    presenceLockExplanation(this.heldPostes()),
  );

  constructor() {
    inject(PageHeaderService).set({
      title: 'Accueil',
      subtitle: `${this.formatDateForDisplay(this.currentDate)} · semaine ${this.getWeekNumber(this.currentDate)}`,
      breadcrumb: ['Espace', 'Accueil'],
      activeNavId: 'home',
    });
    effect(() => {
      const e = this.responseEvent();
      if (!e || e.memberPresenceStatus !== 'init') return;
      untracked(() => void this.events.loadMemberPresence(e.id));
    });
  }

  ngOnInit(): void {
    void this.events.load();
    void this.stocks.load();

    void this.encaissements.load();
    void this.role.load();
    this.quickActions.load();
    this.activity.load();
  }

  protected async respondPresent(): Promise<void> {
    const e = this.responseEvent();
    if (e) await this.submitPresence(e, Presence.PRESENT);
  }

  protected async respondAbsent(): Promise<void> {
    const e = this.responseEvent();
    if (!e) return;
    if (this.presenceLocked()) return;
    await this.submitPresence(e, Presence.ABSENT);
  }

  private async submitPresence(event: EventDetail, presence: Presence): Promise<void> {
    const result = await this.events.setMemberPresence(event.id, presence);
    if (result.ok) return;

    const view = presenceErrorView(result.error);
    this.toast.show({ type: 'error', title: view.title, message: view.message });

    void this.memberAssignments.refresh();
  }

  protected readonly memberData = this.store.selectSignal(selectMember);
  protected readonly firstName = computed(() => this.memberData()?.firstName ?? '');

  protected readonly icCheck = LucideCheck;
  protected readonly icPlus = LucidePlus;
  protected readonly icCalendar = LucideCalendar;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icSettings = LucideSettings;
  protected readonly icUsers = LucideUsers;
  protected readonly icQr = LucideQrCode;
  protected readonly icZap = LucideZap;
  protected readonly icChevronRight = LucideChevronRight;

  protected readonly chartSeries = CHART_SERIES;

  protected readonly periods = ['1A', '3A', '6A', '12A'];
  protected readonly activePeriodIndex = signal(PERIOD_LIMITS.indexOf(6));

  /** `total()` est en centimes : le formater brut affichait cent fois la somme. */
  protected readonly encaissementsTotal = computed(
    () => `${formatCents(this.encaissements.total())} €`,
  );

  protected money(cents: number): string {
    return `${formatCents(cents)} €`;
  }
  protected readonly periodCount = computed(() => PERIOD_LIMITS[this.activePeriodIndex()]);

  protected setPeriod(index: number): void {
    this.activePeriodIndex.set(index);
    this.encaissements.setLimit(PERIOD_LIMITS[index]);
  }

  protected goToAgenda(): void {
    void this.router.navigateByUrl(`/${AppRoutes.presences}`);
  }

  protected runQuickAction(label: string): void {
    const route = QUICK_ACTION_ROUTES[label];
    if (route !== undefined) void this.router.navigateByUrl(`/${route}`);
  }

  protected readonly r3: readonly null[] = [null, null, null];
  protected readonly r4: readonly null[] = [null, null, null, null];
  protected readonly r6: readonly null[] = [null, null, null, null, null, null];

  protected pct(v: number): number {
    return (v / this.encaissements.max()) * 100;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  private formatDateForDisplay(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', weekday: 'long' };
    const res = date.toLocaleDateString('fr-FR', options);
    return res.charAt(0).toUpperCase() + res.slice(1);
  }
}

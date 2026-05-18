import {
  ChangeDetectionStrategy,
  Component,
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
import { AppRoutes } from '#app/app.routes';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Card } from '#shared/components/ui/card/card';
import { Avatar } from '#shared/components/ui/avatar/avatar';
import { Skeleton } from '#shared/components/ui/skeleton/skeleton';
import { StatsStore } from '#core/store/home-data/stats.store';
import { EncaissementsStore } from '#core/store/home-data/encaissements.store';
import { QuickActionsStore } from '#core/store/home-data/quick-actions.store';
import { ActivityFeedStore } from '#core/store/home-data/activity-feed.store';
import { RoleAssignmentStore } from '#core/store/home-data/role-assignment.store';
import { AgendaStore } from '#core/store/home-data/agenda.store';
import { AlertsStore } from '#core/store/home-data/alerts.store';
import { NextEventStore } from '#core/store/home-data/next-event.store';
import { EventsStore } from '#core/store/events.store';
import { EventDetail, Presence } from '#core/models/event.model';
import { startOfDay } from 'date-fns';

@Component({
  selector: 'bfd-home',
  imports: [Btn, Badge, Card, Avatar, Skeleton, LucideDynamicIcon],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly store = inject(Store);
  private readonly events = inject(EventsStore);
  private readonly router = inject(Router);
  private readonly currentDate = new Date();

  // Each card pulls from its own NgRx (signal) store with independent loading state.
  protected readonly stats = inject(StatsStore);
  protected readonly nextEvent = inject(NextEventStore);
  protected readonly agenda = inject(AgendaStore);
  protected readonly alerts = inject(AlertsStore);
  protected readonly encaissements = inject(EncaissementsStore);
  protected readonly role = inject(RoleAssignmentStore);
  protected readonly quickActions = inject(QuickActionsStore);
  protected readonly activity = inject(ActivityFeedStore);

  protected readonly Presence = Presence;

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

  protected respondPresent(): void {
    const e = this.responseEvent();
    if (e) this.events.setMemberPresence(e.id, Presence.PRESENT);
  }

  protected respondAbsent(): void {
    const e = this.responseEvent();
    if (e) this.events.setMemberPresence(e.id, Presence.ABSENT);
  }

  protected readonly memberData = this.store.selectSignal(selectMember);
  protected readonly firstName = computed(() => this.memberData()?.firstName ?? '');

  // Static presentation-only icon refs.
  protected readonly icCheck = LucideCheck;
  protected readonly icPlus = LucidePlus;
  protected readonly icCalendar = LucideCalendar;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icSettings = LucideSettings;
  protected readonly icUsers = LucideUsers;
  protected readonly icQr = LucideQrCode;
  protected readonly icZap = LucideZap;
  protected readonly icChevronRight = LucideChevronRight;

  protected readonly periods = ['1A', '3A', '6A', '12A'];
  protected readonly activePeriodIndex = signal(2);

  protected setPeriod(index: number): void {
    this.activePeriodIndex.set(index);
  }

  protected goToAgenda(): void {
    void this.router.navigateByUrl(`/${AppRoutes.presences}`);
  }

  // Skeleton row counts (templates can't construct arrays inline).
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

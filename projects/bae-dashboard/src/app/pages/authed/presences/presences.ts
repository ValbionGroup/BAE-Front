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
  LucideChevronRight,
  LucideDownload,
  LucideDynamicIcon,
  LucideFunnel,
  LucidePlus,
  LucideUser,
} from '@lucide/angular';
import { Router } from '@angular/router';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn, Skeleton } from '@bae/ui';
import { isSameDay, startOfMonth, startOfToday } from 'date-fns';
import { EventDetail, Presence } from '#core/models/event.model';
import { EventsStore } from '#core/store/events.store';
import { RosterAside } from './roster-aside/roster-aside';

import { PageAction, PageActions } from '#shared/components/page-actions/page-actions';

@Component({
  selector: 'bfd-presences',
  imports: [Btn, Skeleton, RosterAside, LucideDynamicIcon, PageActions],
  templateUrl: './presences.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Presences implements OnInit {
  protected readonly pageActions = computed<readonly PageAction[]>(() => [
    { label: 'Mes présences', icon: this.icUser, primary: true, run: () => this.openMyPresences() },
  ]);

  private readonly pageHeader = inject(PageHeaderService);
  private readonly router = inject(Router);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  protected openMyPresences(): void {
    this.router.navigate(['/presences/my']);
  }

  constructor() {
    this.pageHeader.set({
      title: 'Présences',
      subtitle: "Vos réponses et celles de l'équipe",
      breadcrumb: ['Espace', 'Présences'],
      activeNavId: 'pres',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
    effect(() => {
      const days = this.days();
      const all = this.events.allEvents();
      const visibleIds = new Set<string>();
      for (const d of days) {
        const ev = all.find((e) => isSameDay(d, e.date));
        if (ev) visibleIds.add(ev.id);
      }
      const toFetch: string[] = [];
      for (const id of visibleIds) {
        const ev = this.events.events()[id];
        if (ev?.memberPresenceStatus === 'init') toFetch.push(id);
      }
      if (toFetch.length === 0) return;
      untracked(() => {
        for (const id of toFetch) void this.events.loadMemberPresence(id);
      });
    });
  }

  ngOnInit(): void {
    void this.events.load();
  }

  protected isPresenceLoading(event: EventDetail): boolean {
    const status = event.memberPresenceStatus;
    return status === 'init' || status === 'loading' || status === 'refreshing';
  }

  private readonly events = inject(EventsStore);

  protected readonly icCalendar = LucideCalendar;
  protected readonly icFilter = LucideFunnel;
  protected readonly icDownload = LucideDownload;
  protected readonly icPlus = LucidePlus;
  protected readonly icChevronRight = LucideChevronRight;
  protected readonly icUser = LucideUser;

  protected readonly today = startOfToday();
  protected readonly currentMonth = signal<Date>(startOfMonth(this.today));
  protected readonly activeMonthDisplay = computed(() => {
    const currentMonth = this.currentMonth();

    const m = currentMonth.getMonth();
    return (
      [
        'Janvier',
        'Février',
        'Mars',
        'Avril',
        'Mai',
        'Juin',
        'Juillet',
        'Août',
        'Septembre',
        'Octobre',
        'Novembre',
        'Décembre',
      ][m] +
      ' ' +
      currentMonth.getFullYear()
    );
  });

  protected readonly weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  protected readonly viewTabs = ['Mois', 'Liste', 'Récap'];

  protected readonly activeTab = signal(0);
  protected readonly activeEventView = signal<string | undefined>(undefined);

  protected readonly days = computed(() => {
    const currentMonth = this.currentMonth();
    const start = new Date(startOfMonth(currentMonth));
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  });

  protected eventFor(d: Date): EventDetail | undefined {
    return this.events.allEvents().find((e) => isSameDay(d, e.date));
  }

  protected inMonth(d: Date): boolean {
    return (
      d.getMonth() === this.currentMonth().getMonth() &&
      d.getFullYear() === this.currentMonth().getFullYear()
    );
  }

  protected isToday(d: Date): boolean {
    return (
      d.getDate() === this.today.getDate() &&
      d.getMonth() === this.today.getMonth() &&
      d.getFullYear() === this.today.getFullYear()
    );
  }

  protected respLabel(event: EventDetail): string {
    if (event.memberPresence === Presence.PRESENT) return '✓ Présent·e';
    if (event.memberPresence === Presence.ABSENT) return '✗ Absent·e';
    return '— Non répondu';
  }

  protected previousMonth() {
    const d = new Date(this.currentMonth());
    d.setMonth(d.getMonth() - 1);
    this.currentMonth.set(d);
  }

  protected nextMonth() {
    const d = new Date(this.currentMonth());
    d.setMonth(d.getMonth() + 1);
    this.currentMonth.set(d);
  }

  protected goToToday() {
    this.currentMonth.set(this.today);
  }

  protected selectEventView(index: string | undefined) {
    this.activeEventView.set(index);
  }

  protected getEventColor(event: EventDetail): string {
    if (this.isPresenceLoading(event)) return 'bg-surface-2 text-muted';
    if (event.memberPresence === Presence.PRESENT) return 'bg-ok-soft text-ok';
    if (event.memberPresence === Presence.ABSENT) return 'bg-danger-soft text-danger';
    return 'bg-warn-soft text-warn';
  }
}

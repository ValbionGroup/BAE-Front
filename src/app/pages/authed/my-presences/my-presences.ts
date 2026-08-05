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
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';
import { Card } from '#shared/components/ui/card/card';
import { Toggle } from '#shared/components/ui/toggle/toggle';
import { Skeleton } from '#shared/components/ui/skeleton/skeleton';
import { EventDetail, Presence } from '#core/models/event.model';
import { EventsStore } from '#core/store/events.store';
import { EventsService } from '#core/services/events/events-service';
import { selectMember } from '#core/store/auth/auth.selector';
import { startOfDay } from 'date-fns';

interface ScoreRow {
  readonly k: string;
  readonly v: number;
  readonly sub: string;
}

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

  protected postFor(event: EventDetail): string | null {
    return null;
  }

  protected respondPresent(event: EventDetail): void {
    this.events.setMemberPresence(event.id, Presence.PRESENT);
  }

  protected respondAbsent(event: EventDetail): void {
    this.events.setMemberPresence(event.id, Presence.ABSENT);
  }

  protected pointsFor(event: EventDetail): number {
    return event.memberPresence === Presence.PRESENT ? 8 : 0;
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

  protected ptsClass(pts: number): string {
    return pts > 0 ? 'text-ok' : 'text-muted';
  }

  protected ptsLabel(pts: number): string {
    return pts > 0 ? `+${pts} pts` : '—';
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  LucideCalendar,
  LucideChevronRight,
  LucideDownload,
  LucideDynamicIcon,
  LucideFunnel,
  LucidePlus,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { isSameDay, startOfMonth, startOfToday } from 'date-fns';
import { EventData, EventDetail, Presence } from '#core/models/event.model';
import { EventsStore } from '#core/store/events.store';
import { RosterAside } from './roster-aside/roster-aside';

@Component({
  selector: 'bfd-presences',
  imports: [Btn, RosterAside, LucideDynamicIcon],
  templateUrl: './presences.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Presences {
  constructor() {
    inject(PageHeaderService).set({
      title: 'Présences',
      subtitle: "Vos réponses et celles de l'équipe",
      breadcrumb: ['Espace', 'Présences'],
      activeNavId: 'pres',
    });
  }

  private readonly events = inject(EventsStore);

  protected readonly icCalendar = LucideCalendar;
  protected readonly icFilter = LucideFunnel;
  protected readonly icDownload = LucideDownload;
  protected readonly icPlus = LucidePlus;
  protected readonly icChevronRight = LucideChevronRight;

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

  protected readonly selectedEvent = computed(() => {
    const id = this.activeEventView();
    return id ? this.events.getEventById(id) : undefined;
  });

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

  protected eventFor(d: Date): EventData | undefined {
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

  protected respLabel(resp: EventDetail['memberPresence']): string {
    if (resp === Presence.PRESENT) return '✓ Présent';
    if (resp === Presence.ABSENT) return '✗ Absent';
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
}

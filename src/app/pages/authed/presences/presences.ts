import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  LucideBell,
  LucideCalendar,
  LucideChevronRight,
  LucideDownload,
  LucideDynamicIcon,
  LucideFilter,
  LucidePlus,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';
import { Avatar } from '#shared/components/ui/avatar/avatar';

interface CalEvent {
  readonly name: string;
  readonly kind: 'red' | 'blue' | 'warn';
  readonly resp: 'yes' | 'no' | '—' | 'past';
}

interface RosterRow {
  readonly name: string;
  readonly role: string;
  readonly status: 'yes' | 'no' | '—';
  readonly when: string | null;
  readonly late: boolean;
}

@Component({
  selector: 'bfd-presences',
  imports: [Btn, Badge, Avatar, LucideDynamicIcon],
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

  protected readonly icCalendar = LucideCalendar;
  protected readonly icFilter = LucideFilter;
  protected readonly icDownload = LucideDownload;
  protected readonly icPlus = LucidePlus;
  protected readonly icChevronRight = LucideChevronRight;
  protected readonly icBell = LucideBell;

  protected readonly monthName = 'Février 2026';
  protected readonly weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  protected readonly viewTabs = ['Mois', 'Semaine', 'Liste', 'Récap'];
  protected readonly activeTab = signal(0);

  protected readonly days: readonly Date[] = (() => {
    const start = new Date(2026, 0, 26);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  })();

  private readonly events: Record<string, CalEvent> = {
    '2026-2-14': { name: 'Soirée Hivernale', kind: 'red', resp: 'yes' },
    '2026-2-7': { name: 'Repas Internat.', kind: 'blue', resp: '—' },
    '2026-2-28': { name: 'Repas Alternants', kind: 'red', resp: 'no' },
    '2026-1-31': { name: 'Galette', kind: 'blue', resp: 'past' },
    '2026-2-21': { name: 'Tournoi BAE', kind: 'warn', resp: '—' },
  };

  protected readonly responseStats = [
    { label: 'Présent·e', value: 18, colorClass: 'text-ok' },
    { label: 'Absent·e', value: 4, colorClass: 'text-red' },
    { label: 'Non répondu', value: 2, colorClass: 'text-warn' },
  ];

  protected readonly roster: readonly RosterRow[] = [
    { name: 'Léa Marchand', role: 'Trésorière', status: 'yes', when: '12/02', late: false },
    { name: 'Tom Bessière', role: 'Membre', status: 'yes', when: '11/02', late: false },
    { name: 'Sarah Kamiyana', role: 'Coordo', status: 'yes', when: '11/02', late: false },
    { name: 'Maxime Roussel', role: 'Log', status: 'yes', when: '11/02', late: false },
    { name: 'Inès Berthier', role: 'Membre', status: 'yes', when: '10/02', late: false },
    { name: 'Pierre Lavigne', role: 'Membre', status: 'no', when: '10/02', late: false },
    { name: 'Camille Astier', role: 'Membre', status: '—', when: null, late: true },
    { name: 'Yanis Demir', role: 'Web', status: 'yes', when: '09/02', late: false },
    { name: 'Romain Joly', role: 'Membre', status: 'no', when: '09/02', late: false },
    { name: 'Élise Pradel', role: 'Membre', status: '—', when: null, late: true },
    { name: 'Hugo Martelli', role: 'Membre', status: 'yes', when: '08/02', late: false },
  ];

  protected eventFor(d: Date): CalEvent | undefined {
    return this.events[`2026-${d.getMonth() + 1}-${d.getDate()}`];
  }

  protected inMonth(d: Date): boolean {
    return d.getMonth() === 1;
  }

  protected isToday(d: Date): boolean {
    return d.getDate() === 12 && d.getMonth() === 1;
  }

  protected respLabel(resp: CalEvent['resp']): string {
    if (resp === 'yes') return '✓ Présent';
    if (resp === 'no') return '✗ Absent';
    if (resp === 'past') return 'Passée';
    return '— Non répondu';
  }

  protected evBgClass(kind: CalEvent['kind']): string {
    return kind === 'red'
      ? 'bg-red-soft text-red'
      : kind === 'blue'
        ? 'bg-blue-soft text-blue'
        : 'bg-warn-soft text-warn';
  }

  protected rosterStatusBadge(r: RosterRow): { label: string; kind: BadgeKind; dot: boolean } {
    if (r.status === 'yes') return { label: 'Présent·e', kind: 'ok', dot: false };
    if (r.status === 'no') return { label: 'Absent·e', kind: 'red', dot: false };
    if (r.late) return { label: 'Rappelé·e', kind: 'warn', dot: true };
    return { label: '—', kind: 'neutral', dot: false };
  }
}

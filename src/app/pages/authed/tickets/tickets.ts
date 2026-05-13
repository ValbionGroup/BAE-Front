import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  LucideCheck,
  LucideClock,
  LucideDynamicIcon,
  LucideIconInput,
  LucideMail,
  LucidePlus,
  LucideTriangleAlert,
  LucideUser,
  LucideZap,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';
import { Avatar } from '#shared/components/ui/avatar/avatar';

interface Ticket {
  readonly id: string;
  readonly s: 'Bug' | 'Amélioration' | 'Nouveauté';
  readonly t: string;
  readonly st: 'new' | 'inprog' | 'closed';
  readonly by: string;
  readonly when: string;
  readonly cmt: number;
  readonly p: 'high' | 'mid' | 'low';
}

interface HistoryEntry {
  readonly c: string;
  readonly who: string;
  readonly when: string;
  readonly icon: LucideIconInput;
}

@Component({
  selector: 'bfd-tickets',
  imports: [Btn, Badge, Avatar, LucideDynamicIcon],
  templateUrl: './tickets.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tickets {
  constructor() {
    inject(PageHeaderService).set({
      title: 'Tickets',
      subtitle: '6 tickets · 2 nouveaux',
      breadcrumb: ['Support', 'Tickets'],
      activeNavId: 'tick',
    });
  }

  protected readonly icPlus = LucidePlus;
  protected readonly icUser = LucideUser;
  protected readonly icClock = LucideClock;
  protected readonly icCheck = LucideCheck;
  protected readonly icAlert = LucideTriangleAlert;
  protected readonly icZap = LucideZap;
  protected readonly icMail = LucideMail;

  protected readonly tabs = ['Tout (6)', 'Nouveau (2)', 'En cours (2)', 'Clos (2)', 'Mes tickets'];
  protected readonly activeTab = signal(0);
  protected readonly selectedIdx = signal(0);

  protected readonly tickets: readonly Ticket[] = [
    {
      id: 'T-184',
      s: 'Bug',
      t: 'Lydia QR ne se ferme pas auto',
      st: 'new',
      by: 'Tom B.',
      when: 'il y a 12 min',
      cmt: 0,
      p: 'high',
    },
    {
      id: 'T-183',
      s: 'Bug',
      t: 'Stock négatif après annulation',
      st: 'inprog',
      by: 'Léa M.',
      when: 'il y a 2h',
      cmt: 3,
      p: 'mid',
    },
    {
      id: 'T-182',
      s: 'Amélioration',
      t: 'Pouvoir scanner plusieurs lots à la suite',
      st: 'inprog',
      by: 'Hugo L.',
      when: 'hier',
      cmt: 5,
      p: 'mid',
    },
    {
      id: 'T-181',
      s: 'Nouveauté',
      t: 'Module gestion des prêts de matériel',
      st: 'new',
      by: 'Camille R.',
      when: 'hier',
      cmt: 1,
      p: 'low',
    },
    {
      id: 'T-180',
      s: 'Bug',
      t: 'Email de relance envoyé en double',
      st: 'closed',
      by: 'Sarah M.',
      when: '3 j.',
      cmt: 4,
      p: 'mid',
    },
    {
      id: 'T-179',
      s: 'Amélioration',
      t: 'Filtre par promo dans Présences',
      st: 'closed',
      by: 'Antoine R.',
      when: '5 j.',
      cmt: 2,
      p: 'low',
    },
  ];

  protected readonly history: readonly HistoryEntry[] = [
    { c: 'Ticket créé', who: 'Tom B.', when: 'il y a 12 min', icon: LucidePlus },
    { c: 'Email envoyé au pôle web', who: 'auto', when: 'il y a 12 min', icon: LucideMail },
  ];

  protected statusLabel(st: Ticket['st']): { label: string; kind: BadgeKind } {
    if (st === 'new') return { label: 'Nouveau', kind: 'blue' };
    if (st === 'inprog') return { label: 'En cours', kind: 'warn' };
    return { label: 'Clos', kind: 'ok' };
  }

  protected typeIcon(s: Ticket['s']): LucideIconInput {
    if (s === 'Bug') return LucideTriangleAlert;
    if (s === 'Amélioration') return LucideZap;
    return LucidePlus;
  }

  protected typeBgClass(s: Ticket['s']): string {
    if (s === 'Bug') return 'bg-danger-soft text-danger';
    if (s === 'Amélioration') return 'bg-warn-soft text-warn';
    return 'bg-blue-soft text-blue';
  }
}

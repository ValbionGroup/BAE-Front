import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  LucideDownload,
  LucideDynamicIcon,
  LucideEllipsis,
  LucideEuro,
  LucideIconInput,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideShield,
  LucideStar,
  LucideTrash2,
  LucideZap,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';
import { Card } from '#shared/components/ui/card/card';
import { Avatar } from '#shared/components/ui/avatar/avatar';
import { Input } from '#shared/components/ui/input/input';

interface TeamMember {
  readonly nom: string;
  readonly role: string;
  readonly scope: string;
  readonly prom: string;
  readonly last: string;
  readonly on: boolean;
  readonly star?: boolean;
}

type Perm = 'rw' | 'r' | '—';

interface PermsRow {
  readonly mod: string;
  readonly pres: Perm;
  readonly tres: Perm;
  readonly log: Perm;
  readonly coo: Perm;
  readonly cui: Perm;
  readonly com: Perm;
  readonly mb: Perm;
}

interface Invitation {
  readonly mail: string;
  readonly role: string;
  readonly exp: string;
}

interface AuditEntry {
  readonly who: string;
  readonly a: string;
  readonly em?: string;
  readonly s?: string;
  readonly when: string;
  readonly icon: LucideIconInput;
  readonly c: 'warn' | 'ok' | 'danger' | 'blue' | 'neutral';
}

@Component({
  selector: 'bfd-equipe',
  imports: [Btn, Badge, Card, Avatar, Input, LucideDynamicIcon],
  templateUrl: './equipe.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Equipe {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  constructor() {
    this.pageHeader.set({
      title: 'Équipe BAE',
      subtitle: '14 membres · 7 rôles · admin réservé Présidence + Trésorerie',
      breadcrumb: ['Paramètres', 'Équipe BAE'],
      activeNavId: 'team',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  protected readonly icDownload = LucideDownload;
  protected readonly icPlus = LucidePlus;
  protected readonly icSearch = LucideSearch;
  protected readonly icMore = LucideEllipsis;
  protected readonly icStar = LucideStar;

  protected readonly tabs = ['Membres', 'Rôles & permissions', 'Audit · activité', 'Invitations'];
  protected readonly activeTab = signal(0);

  protected readonly team: readonly TeamMember[] = [
    {
      nom: 'Sarah Khelifi',
      role: 'Présidente',
      scope: 'Toute admin',
      prom: '4A · Alt.',
      last: 'Il y a 2 min',
      on: true,
      star: true,
    },
    {
      nom: 'Léa Marchand',
      role: 'Trésorière',
      scope: 'Paiements · Caisse',
      prom: '2A · Alt.',
      last: 'En ligne',
      on: true,
      star: true,
    },
    {
      nom: 'Maxime Toussaint',
      role: 'Logistique',
      scope: 'Stocks · Courses',
      prom: '3A · Alt.',
      last: 'Il y a 14 min',
      on: true,
    },
    {
      nom: 'Inès Dubreuil',
      role: 'Coordo',
      scope: 'Présences · Affect',
      prom: '2A · Alt.',
      last: 'Il y a 1h',
      on: false,
    },
    {
      nom: 'Tom Bessière',
      role: 'Cuistot référent',
      scope: 'Recettes',
      prom: '3A · Alt.',
      last: 'Hier',
      on: false,
    },
    {
      nom: 'Anaïs Roux',
      role: 'Communication',
      scope: 'Précommandes',
      prom: '1A · Init.',
      last: 'Hier',
      on: false,
    },
    {
      nom: 'Élise Vasseur',
      role: 'Membre actif',
      scope: 'Lecture · Caisse',
      prom: '5A · Alt.',
      last: 'Il y a 3 j',
      on: false,
    },
    {
      nom: 'Marwane B.',
      role: 'Membre actif',
      scope: 'Lecture',
      prom: '1A · Init.',
      last: 'Il y a 5 j',
      on: false,
    },
  ];

  protected readonly perms: readonly PermsRow[] = [
    { mod: 'Adhérents', pres: 'rw', tres: 'rw', log: 'r', coo: 'r', cui: '—', com: 'r', mb: '—' },
    { mod: 'Stocks', pres: 'rw', tres: 'r', log: 'rw', coo: 'r', cui: 'rw', com: '—', mb: 'r' },
    { mod: 'Recettes', pres: 'rw', tres: 'r', log: 'r', coo: 'r', cui: 'rw', com: 'r', mb: 'r' },
    {
      mod: 'Coordination',
      pres: 'rw',
      tres: 'r',
      log: 'r',
      coo: 'rw',
      cui: 'r',
      com: 'r',
      mb: '—',
    },
    { mod: 'Logistique', pres: 'rw', tres: 'rw', log: 'rw', coo: 'r', cui: 'r', com: '—', mb: '—' },
    { mod: 'Caisse', pres: 'rw', tres: 'rw', log: 'r', coo: 'r', cui: 'r', com: 'r', mb: 'rw' },
    { mod: 'Paiements', pres: 'rw', tres: 'rw', log: '—', coo: '—', cui: '—', com: '—', mb: '—' },
    {
      mod: 'Précommandes',
      pres: 'rw',
      tres: 'rw',
      log: 'r',
      coo: 'r',
      cui: 'r',
      com: 'rw',
      mb: 'r',
    },
    { mod: 'Analyse', pres: 'rw', tres: 'rw', log: 'r', coo: 'r', cui: 'r', com: 'r', mb: '—' },
  ];

  protected readonly invitations: readonly Invitation[] = [
    { mail: 'c.guerin@etu.ec.fr', role: 'Coordo (suppléant)', exp: '14 fév.' },
    { mail: 'r.albert@etu.ec.fr', role: 'Membre actif', exp: '14 fév.' },
  ];

  protected readonly audit: readonly AuditEntry[] = [
    {
      who: 'Sarah K.',
      a: 'a modifié le rôle de ',
      em: 'Inès Dubreuil',
      s: ' → Coordo',
      when: '14:32',
      icon: LucidePencil,
      c: 'warn',
    },
    {
      who: 'Léa M.',
      a: 'a validé un encaissement espèces ',
      em: '+148 €',
      when: '14:18',
      icon: LucideEuro,
      c: 'ok',
    },
    {
      who: 'Maxime T.',
      a: 'a supprimé le lot ',
      em: '#L23-117',
      when: '11:04',
      icon: LucideTrash2,
      c: 'danger',
    },
    { who: 'Sarah K.', a: "s'est connectée ", when: '09:12', icon: LucideShield, c: 'blue' },
    {
      who: 'Système',
      a: 'a relancé 2 adhérents · soldes négatifs',
      when: 'Hier',
      icon: LucideZap,
      c: 'neutral',
    },
  ];

  protected roleKind(role: string): BadgeKind {
    if (role.includes('Présid')) return 'red';
    if (role.includes('Trésor')) return 'blue';
    return 'neutral';
  }

  protected permClass(p: Perm): { wrap: string; label: string } {
    if (p === 'rw') return { wrap: 'bg-ok-soft text-ok', label: 'R+W' };
    if (p === 'r') return { wrap: 'bg-surface-2 text-text-2', label: 'R' };
    return { wrap: 'border border-dashed border-border text-faint', label: '—' };
  }

  protected auditIconClass(c: AuditEntry['c']): string {
    if (c === 'warn') return 'bg-warn-soft text-warn';
    if (c === 'ok') return 'bg-ok-soft text-ok';
    if (c === 'danger') return 'bg-danger-soft text-danger';
    if (c === 'blue') return 'bg-blue-soft text-blue';
    return 'bg-surface-2 text-muted';
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  LucideArrowRight,
  LucideCalendar,
  LucideCheck,
  LucideChevronRight,
  LucideClock,
  LucideDynamicIcon,
  LucideIconInput,
  LucidePlus,
  LucideQrCode,
  LucideScanLine,
  LucideSettings,
  LucideShoppingCart,
  LucideTicket,
  LucideTriangleAlert,
  LucideTruck,
  LucideUser,
  LucideUsers,
  LucideZap,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';
import { Card } from '#shared/components/ui/card/card';
import { Avatar } from '#shared/components/ui/avatar/avatar';
import { Store } from '@ngrx/store';
import { selectMember } from '#core/store/auth/auth.selector';

interface KpiTile {
  readonly label: string;
  readonly value: string;
  readonly delta: string;
  readonly positive: boolean;
}

interface PrepCell {
  readonly label: string;
  readonly value: string;
  readonly progress: number | null;
  readonly colorVar: string;
}

interface AgendaEvent {
  readonly day: string;
  readonly month: string;
  readonly name: string;
  readonly sub: string;
  readonly status: string;
  readonly statusKind: BadgeKind;
}

interface AlertItem {
  readonly icon: LucideIconInput;
  readonly title: string;
  readonly sub: string;
  readonly action: string;
  readonly bgClass: string;
  readonly fgClass: string;
}

interface ChartBar {
  readonly label: string;
  readonly v1: number;
  readonly v2: number;
  readonly isNext: boolean;
}

interface QuickAction {
  readonly label: string;
  readonly icon: LucideIconInput;
}

interface ActivityItem {
  readonly who: string;
  readonly what: string;
  readonly emphasis?: string;
  readonly tail?: string;
  readonly when: string;
}

@Component({
  selector: 'bfd-home',
  imports: [Btn, Badge, Card, Avatar, LucideDynamicIcon],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly store = inject(Store);

  constructor() {
    inject(PageHeaderService).set({
      title: 'Accueil',
      subtitle: 'Jeudi 12 février · semaine 7',
      breadcrumb: ['Espace', 'Accueil'],
      activeNavId: 'home',
    });
  }

  protected readonly icCheck = LucideCheck;
  protected readonly icPlus = LucidePlus;
  protected readonly icCalendar = LucideCalendar;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icSettings = LucideSettings;
  protected readonly icCart = LucideShoppingCart;
  protected readonly icUsers = LucideUsers;
  protected readonly icQr = LucideQrCode;
  protected readonly icZap = LucideZap;
  protected readonly icChevronRight = LucideChevronRight;
  protected readonly icClock = LucideClock;
  protected readonly icTriangleAlert = LucideTriangleAlert;
  protected readonly icTruck = LucideTruck;
  protected readonly icScan = LucideScanLine;
  protected readonly icUser = LucideUser;
  protected readonly icTicket = LucideTicket;

  protected readonly memberData = this.store.selectSignal(selectMember);

  protected readonly next = {
    name: 'Soirée Hivernale',
    date: 'Ven. 14 fév.',
    start: '19:30',
    days: 3,
    members: 18,
    prereg: 47,
  } as const;

  protected readonly kpis: readonly KpiTile[] = [
    { label: 'Encaissé (cumul.)', value: '4 218 €', delta: '+12%', positive: true },
    { label: 'Adhérents actifs', value: '142', delta: '+4', positive: true },
    { label: 'Stocks valorisés', value: '1 880 €', delta: '−6%', positive: false },
  ];

  protected readonly prepCells: readonly PrepCell[] = [
    { label: 'Recettes', value: '3/3', progress: 100, colorVar: 'var(--bae-ok)' },
    { label: 'Liste de courses', value: '12/14', progress: 86, colorVar: 'var(--bae-blue)' },
    { label: 'Postes affectés', value: '11/18', progress: 61, colorVar: 'var(--bae-warn)' },
    { label: 'Précommandes', value: '47', progress: null, colorVar: 'var(--bae-red)' },
  ];

  protected readonly agenda: readonly AgendaEvent[] = [
    {
      day: '14',
      month: 'fév',
      name: 'Soirée Hivernale',
      sub: 'Hot-dogs · Bières · Crêpes',
      status: 'Présente',
      statusKind: 'ok',
    },
    {
      day: '07',
      month: 'mar',
      name: 'Soirée Carnaval',
      sub: 'Tapas · Sangria',
      status: '—',
      statusKind: 'neutral',
    },
    {
      day: '28',
      month: 'mar',
      name: 'Repas Alternant·e·s',
      sub: 'Pâtes carbonara',
      status: 'Absente',
      statusKind: 'red',
    },
    {
      day: '12',
      month: 'avr',
      name: 'Soirée Printemps',
      sub: 'Burgers · Cocktails',
      status: '—',
      statusKind: 'neutral',
    },
  ];

  protected readonly alerts: readonly AlertItem[] = [
    {
      icon: LucideTriangleAlert,
      title: 'Lot #L23-117 périmé',
      sub: 'Saucisses Strasbourg · 6 pièces · DLC 09/02',
      action: 'Retirer',
      bgClass: 'bg-danger-soft',
      fgClass: 'text-danger',
    },
    {
      icon: LucideClock,
      title: '2 réponses présence manquantes',
      sub: 'Soirée Hivernale · J-3 · relance auto activée',
      action: 'Relancer',
      bgClass: 'bg-warn-soft',
      fgClass: 'text-warn',
    },
    {
      icon: LucideTruck,
      title: 'Liste de courses prête',
      sub: '14 produits · 2 enseignes · ~218 €',
      action: 'Ouvrir',
      bgClass: 'bg-blue-soft',
      fgClass: 'text-blue',
    },
  ];

  protected readonly chartBars: readonly ChartBar[] = [
    { label: 'Halloween', v1: 540, v2: 180, isNext: false },
    { label: 'Toussaint', v1: 280, v2: 120, isNext: false },
    { label: 'Hiver', v1: 720, v2: 240, isNext: false },
    { label: 'Noël', v1: 880, v2: 320, isNext: false },
    { label: 'Galette', v1: 460, v2: 180, isNext: false },
    { label: 'St-Val.', v1: 0, v2: 0, isNext: true },
  ];
  protected readonly chartMax = 1200;
  protected readonly periods = ['1A', '3A', '6A', '12A'];
  protected readonly activePeriodIndex = 2;

  protected readonly roleMeta: readonly { label: string; value: string }[] = [
    { label: 'Service', value: '19:30 — 22:00' },
    { label: 'Pause', value: '20:45 (15 min)' },
    { label: 'Co-équipier', value: 'Tom Bessière' },
    { label: 'Coordo', value: 'Sarah K.' },
  ];

  protected readonly quickActions: readonly QuickAction[] = [
    { label: 'Nouvelle commande', icon: LucideShoppingCart },
    { label: 'Scanner un produit', icon: LucideScanLine },
    { label: 'Encaisser Lydia', icon: LucideQrCode },
    { label: 'Vérifier adhérent', icon: LucideUser },
    { label: 'Ajouter au stock', icon: LucidePlus },
    { label: 'Ouvrir un ticket', icon: LucideTicket },
  ];

  protected readonly activity: readonly ActivityItem[] = [
    {
      who: 'Maxime',
      what: 'a marqué le lot ',
      emphasis: '#L23-117',
      tail: ' périmé',
      when: 'il y a 4 min',
    },
    { who: 'Sarah', what: "a lancé l'algo de répartition", when: 'il y a 22 min' },
    { who: 'Tom', what: "a uploadé une preuve d'achat ", emphasis: 'Carrefour', when: '14:02' },
    {
      who: 'Inès',
      what: 'a ouvert le ticket ',
      emphasis: '#142',
      tail: ' « scan code-barres »',
      when: '11:48',
    },
  ];

  protected pct(v: number): number {
    return (v / this.chartMax) * 100;
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import {
  LucideArrowRight,
  LucideCheck,
  LucideChevronDown,
  LucideDownload,
  LucideDynamicIcon,
  LucideIconInput,
  LucidePlus,
  LucideStar,
  LucideTicket,
  LucideTriangleAlert,
  LucideX,
  LucideZap,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { ModalService } from '#shared/components/modal/modal.service';
import { CoordinationNewModal } from '#shared/components/modal/coordination-new-modal/coordination-new-modal';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Card } from '#shared/components/ui/card/card';
import { Avatar } from '#shared/components/ui/avatar/avatar';

interface HeroMetric {
  readonly l: string;
  readonly v: string;
  readonly d: string;
  readonly big?: boolean;
}

interface Segment {
  readonly l: string;
  readonly v: number;
  readonly p: number;
  readonly cls: string;
  readonly bg: string;
}

interface ChannelDetail {
  readonly l: string;
  readonly v: string;
  readonly sub: string;
  readonly cls: string;
}

interface Product {
  readonly n: string;
  readonly q: number;
  readonly v: number;
  readonly marge: number;
  readonly tag?: 'star' | 'new';
}

interface TeamMember {
  readonly who: string;
  readonly role: string;
  readonly score: number;
  readonly k?: string;
  readonly mvp?: boolean;
}

interface StockConsumed {
  readonly p: string;
  readonly q: number;
  readonly r: number;
  readonly ok: boolean;
}

interface RetroItem {
  readonly k: 'ok' | 'warn' | 'blue' | 'danger';
  readonly icon: LucideIconInput;
  readonly t: string;
  readonly s: string;
}

@Component({
  selector: 'bfd-soiree-bilan',
  imports: [Btn, Badge, Card, Avatar, LucideDynamicIcon],
  templateUrl: './bilan.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoireeBilan {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly modals = inject(ModalService);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  protected planNext(): void {
    this.modals.open({ type: 'component', component: CoordinationNewModal });
  }

  constructor() {
    this.pageHeader.set({
      title: 'Bilan · Soirée Hivernale',
      subtitle: 'Ven. 14 fév. · 19:30 — 23:00 · clôturée le 14 fév. à 23:48 par Sarah K.',
      breadcrumb: ['Analyse', 'Soirées', 'Hivernale'],
      activeNavId: 'soir',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  protected readonly icTicket = LucideTicket;
  protected readonly icDownload = LucideDownload;
  protected readonly icCheck = LucideCheck;
  protected readonly icChevDown = LucideChevronDown;
  protected readonly icPlus = LucidePlus;
  protected readonly icStar = LucideStar;
  protected readonly icArrow = LucideArrowRight;
  protected readonly icAlert = LucideTriangleAlert;
  protected readonly icZap = LucideZap;
  protected readonly icX = LucideX;

  protected readonly hero: readonly HeroMetric[] = [
    { l: 'Recette totale', v: '3 218 €', d: '+18%', big: true },
    { l: 'Marge nette', v: '1 947 €', d: '60,5%' },
    { l: 'Clients servis', v: '187', d: '+24' },
    { l: 'Panier moyen', v: '17,21 €', d: '+1,40 €' },
    { l: 'Précommandes', v: '47 / 47', d: '100% retirées' },
  ];

  protected readonly segments: readonly Segment[] = [
    { l: 'Lydia · QR', v: 1486, p: 46, cls: 'text-blue', bg: 'bg-blue' },
    { l: 'Caisse esp.', v: 591, p: 18, cls: 'text-warn', bg: 'bg-warn' },
    { l: 'CB', v: 823, p: 26, cls: 'text-red', bg: 'bg-red' },
    { l: 'Précommandes', v: 318, p: 10, cls: 'text-ok', bg: 'bg-ok' },
  ];

  protected readonly channels: readonly ChannelDetail[] = [
    { l: 'Lydia · QR', v: '1 486,00 €', sub: '54 paiements', cls: 'bg-blue' },
    { l: 'Caisse esp.', v: '591,30 €', sub: '38 paiements', cls: 'bg-warn' },
    { l: 'CB', v: '822,70 €', sub: '21 paiements', cls: 'bg-red' },
    { l: 'Précommandes', v: '318,00 €', sub: '47 retraits', cls: 'bg-ok' },
  ];

  protected readonly products: readonly Product[] = [
    { n: 'Hot-dog classique', q: 84, v: 294.0, marge: 168, tag: 'star' },
    { n: 'Heineken 33cl', q: 132, v: 330.0, marge: 174 },
    { n: 'Hot-dog fromage', q: 41, v: 164.0, marge: 84 },
    { n: 'Frites', q: 58, v: 145.0, marge: 92 },
    { n: 'Coca 33cl', q: 67, v: 100.5, marge: 64 },
    { n: 'Hot-dog veggie', q: 18, v: 63.0, marge: 38 },
    { n: 'Crêpe Nutella', q: 24, v: 48.0, marge: 32 },
    { n: 'Soft maison', q: 11, v: 22.0, marge: 14, tag: 'new' },
  ];

  protected readonly maxRevenue = this.products[0].v;

  protected readonly team: readonly TeamMember[] = [
    { who: 'Léa Marchand', role: 'Caisse A', score: 96, k: 'MVP soirée', mvp: true },
    { who: 'Tom Bessière', role: 'Caisse A', score: 92, k: '+8 vs habituel' },
    { who: 'Maxime T.', role: 'Cuisine', score: 88, k: 'Tenu cadence' },
    { who: 'Anaïs Roux', role: 'Cuisine', score: 85, k: 'Première soirée' },
    { who: 'Inès Dubreuil', role: 'Caisse B', score: 82 },
    { who: 'Sarah Khelifi', role: 'Bar', score: 78 },
  ];

  protected readonly stockConsumed: readonly StockConsumed[] = [
    { p: 'Saucisses Strasbourg', q: 143, r: 7, ok: false },
    { p: 'Pain hot-dog', q: 143, r: 12, ok: false },
    { p: 'Heineken 33cl', q: 132, r: 38, ok: true },
    { p: 'Frites surgelées', q: 58, r: 42, ok: true },
  ];

  protected readonly retros: readonly RetroItem[] = [
    {
      k: 'ok',
      icon: LucideCheck,
      t: 'Précommandes 100% retirées',
      s: 'Slot 20:15 fluide · +3 staff suggérés',
    },
    {
      k: 'warn',
      icon: LucideTriangleAlert,
      t: 'Cadence cuisine au plafond',
      s: 'Prévoir 1 cuistot de plus à partir de 21h',
    },
    {
      k: 'blue',
      icon: LucideZap,
      t: 'Soft maison à pousser',
      s: 'CA marginal mais marge 88% · à mettre en avant',
    },
    {
      k: 'danger',
      icon: LucideX,
      t: 'Écart caisse −2,00 €',
      s: 'Erreur rendu monnaie probable · pas critique',
    },
  ];

  protected retroIconClass(k: RetroItem['k']): string {
    if (k === 'ok') return 'bg-ok-soft text-ok';
    if (k === 'warn') return 'bg-warn-soft text-warn';
    if (k === 'blue') return 'bg-blue-soft text-blue';
    return 'bg-danger-soft text-danger';
  }

  protected pct(v: number): number {
    return (v / this.maxRevenue) * 100;
  }
}

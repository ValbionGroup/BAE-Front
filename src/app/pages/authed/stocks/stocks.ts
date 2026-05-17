import {ChangeDetectionStrategy, Component, effect, inject, TemplateRef, viewChild} from '@angular/core';
import {
  LucideClock,
  LucideDownload,
  LucideDynamicIcon,
  LucideEuro,
  LucideFunnel,
  LucideIconInput,
  LucideEllipsis,
  LucidePackage,
  LucidePencil,
  LucidePlus,
  LucideScanLine,
  LucideSearch,
  LucideTrash2,
  LucideTriangleAlert,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Card } from '#shared/components/ui/card/card';
import { Checkbox } from '#shared/components/ui/checkbox/checkbox';
import { Input } from '#shared/components/ui/input/input';

interface Kpi {
  readonly label: string;
  readonly value: string;
  readonly colorClass: string;
  readonly icon: LucideIconInput;
  readonly sub: string;
}

interface Product {
  readonly n: string;
  readonly cat: string;
  readonly qty: string;
  readonly u: string;
  readonly loc: string;
  readonly dlc: string;
  readonly dlcK: 'expired' | 'soon' | 'ok';
  readonly lots: number;
  readonly op: boolean;
}

interface Lot {
  readonly id: string;
  readonly dlc: string;
  readonly open: string;
  readonly qty: number;
  readonly kind: 'expired' | 'soon' | 'ok';
  readonly prio: boolean;
}

@Component({
  selector: 'bfd-stocks',
  imports: [Btn, Badge, Card, Checkbox, Input, LucideDynamicIcon],
  templateUrl: './stocks.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stocks {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  constructor() {
    this.pageHeader.set({
      title: 'Stocks',
      subtitle: '142 produits · 318 lots · 1 880 € valorisés',
      breadcrumb: ['Préparation', 'Stocks'],
      activeNavId: 'stocks',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  protected readonly icScan = LucideScanLine;
  protected readonly icDownload = LucideDownload;
  protected readonly icPlus = LucidePlus;
  protected readonly icSearch = LucideSearch;
  protected readonly icFilter = LucideFunnel;
  protected readonly icMore = LucideEllipsis;
  protected readonly icEdit = LucidePencil;
  protected readonly icTrash = LucideTrash2;

  protected readonly kpis: readonly Kpi[] = [
    {
      label: 'Périmés',
      value: '3 lots',
      colorClass: 'text-danger',
      icon: LucideTriangleAlert,
      sub: '14 €',
    },
    {
      label: 'Proche péremption',
      value: '8 lots',
      colorClass: 'text-warn',
      icon: LucideClock,
      sub: '3 prod. en frais',
    },
    {
      label: 'Lots entamés',
      value: '11',
      colorClass: 'text-text',
      icon: LucidePackage,
      sub: 'À utiliser en priorité',
    },
    {
      label: 'Valeur stock',
      value: '1 880 €',
      colorClass: 'text-text',
      icon: LucideEuro,
      sub: '−6% vs sem. dern.',
    },
  ];

  protected readonly filterTabs = ['Tous', 'Frais', 'Sec', 'Congel', 'Boisson'];

  protected readonly products: readonly Product[] = [
    {
      n: 'Saucisses Strasbourg',
      cat: 'Frais',
      qty: '24',
      u: 'pc',
      loc: 'Frigo A',
      dlc: '09/02',
      dlcK: 'expired',
      lots: 2,
      op: true,
    },
    {
      n: 'Pains hot-dog x6',
      cat: 'Sec',
      qty: '8',
      u: 'paq',
      loc: 'Réserve',
      dlc: '16/02',
      dlcK: 'soon',
      lots: 3,
      op: false,
    },
    {
      n: 'Heineken 33cl',
      cat: 'Boisson',
      qty: '96',
      u: 'btl',
      loc: 'Frigo B',
      dlc: '09/2026',
      dlcK: 'ok',
      lots: 4,
      op: false,
    },
    {
      n: 'Kronenbourg 50cl',
      cat: 'Boisson',
      qty: '48',
      u: 'btl',
      loc: 'Réserve',
      dlc: '11/2026',
      dlcK: 'ok',
      lots: 2,
      op: false,
    },
    {
      n: 'Coca-Cola 33cl',
      cat: 'Boisson',
      qty: '72',
      u: 'cn',
      loc: 'Frigo B',
      dlc: '04/2027',
      dlcK: 'ok',
      lots: 1,
      op: false,
    },
    {
      n: 'Ketchup Heinz 875g',
      cat: 'Sec',
      qty: '4',
      u: 'btl',
      loc: 'Réserve',
      dlc: '08/2026',
      dlcK: 'ok',
      lots: 2,
      op: true,
    },
    {
      n: 'Moutarde Maille 215g',
      cat: 'Sec',
      qty: '3',
      u: 'btl',
      loc: 'Réserve',
      dlc: '12/2026',
      dlcK: 'ok',
      lots: 1,
      op: true,
    },
    {
      n: 'Frites surgelées 2,5kg',
      cat: 'Congel',
      qty: '6',
      u: 'sac',
      loc: 'Congél.',
      dlc: '03/2027',
      dlcK: 'ok',
      lots: 2,
      op: true,
    },
    {
      n: 'Oignons rouges',
      cat: 'Frais',
      qty: '1,8',
      u: 'kg',
      loc: 'Frigo A',
      dlc: '22/02',
      dlcK: 'soon',
      lots: 1,
      op: false,
    },
    {
      n: 'Cornichons 720g',
      cat: 'Sec',
      qty: '5',
      u: 'bcl',
      loc: 'Réserve',
      dlc: '07/2027',
      dlcK: 'ok',
      lots: 1,
      op: false,
    },
    {
      n: 'Eau plate 1,5L',
      cat: 'Boisson',
      qty: '24',
      u: 'btl',
      loc: 'Réserve',
      dlc: '11/2026',
      dlcK: 'ok',
      lots: 1,
      op: false,
    },
    {
      n: 'Crème fraîche 50cl',
      cat: 'Frais',
      qty: '2',
      u: 'pot',
      loc: 'Frigo A',
      dlc: '18/02',
      dlcK: 'soon',
      lots: 1,
      op: false,
    },
  ];

  protected readonly lots: readonly Lot[] = [
    { id: 'L23-117', dlc: '09/02/2026', open: '02/02', qty: 6, kind: 'expired', prio: false },
    { id: 'L23-122', dlc: '24/02/2026', open: '—', qty: 6, kind: 'soon', prio: true },
    { id: 'L23-128', dlc: '12/03/2026', open: '—', qty: 12, kind: 'ok', prio: false },
  ];

  protected range(n: number): readonly null[] {
    return Array.from({ length: n }, () => null);
  }

  protected lotBarColor(idx: number, dlcK: Product['dlcK']): string {
    if (idx === 0 && dlcK === 'expired') return 'var(--bae-danger)';
    if (idx === 0 && dlcK === 'soon') return 'var(--bae-warn)';
    return 'var(--bae-blueDeep)';
  }

  protected dlcDotColor(dlcK: Product['dlcK']): string {
    return dlcK === 'expired' ? 'bg-danger' : dlcK === 'soon' ? 'bg-warn' : 'bg-ok';
  }

  protected dlcTextColor(dlcK: Product['dlcK']): string {
    return dlcK === 'expired' ? 'text-danger' : 'text-text-2';
  }

  protected lotBorderClass(lot: Lot): string {
    if (lot.kind === 'expired') return 'border-danger';
    if (lot.prio) return 'border-warn';
    return 'border-border-s';
  }
}

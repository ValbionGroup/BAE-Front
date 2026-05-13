import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  LucideDownload,
  LucideDynamicIcon,
  LucideLock,
  LucideTicket,
  LucideUpload,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Badge } from '#shared/components/ui/badge/badge';
import { Checkbox } from '#shared/components/ui/checkbox/checkbox';

interface CartLine {
  readonly p: string;
  readonly q: string;
  readonly auchan: number;
  readonly carrefour: number;
  readonly leclerc: number;
  readonly best: 'Auchan' | 'Carrefour' | 'Leclerc';
  readonly checked: boolean;
}

interface Voucher {
  readonly e: string;
  readonly v: number;
  readonly expire: string;
  readonly cond: string;
  readonly warn: boolean;
}

@Component({
  selector: 'bfd-logistique',
  imports: [Badge, Checkbox, LucideDynamicIcon],
  templateUrl: './logistique.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logistique {
  constructor() {
    inject(PageHeaderService).set({
      title: 'Logistique',
      subtitle: 'Liste de courses · Soirée Hivernale',
      breadcrumb: ['Préparation', 'Logistique', 'Courses'],
      activeNavId: 'log',
    });
  }

  protected readonly icUpload = LucideUpload;
  protected readonly icTicket = LucideTicket;
  protected readonly icDownload = LucideDownload;
  protected readonly icLock = LucideLock;

  protected readonly stats = [
    { label: 'Articles', value: '24', colorClass: 'text-text' },
    { label: 'Coût estimé', value: '187,40 €', colorClass: 'text-text' },
    { label: 'Économie multi-enseigne', value: '−12,80 €', colorClass: 'text-ok' },
    { label: "Bons d'achat utilisables", value: '85,00 €', colorClass: 'text-blue' },
  ];

  protected readonly cart: readonly CartLine[] = [
    {
      p: 'Saucisses Strasbourg x10',
      q: '4 pq',
      auchan: 5.4,
      carrefour: 5.2,
      leclerc: 4.95,
      best: 'Leclerc',
      checked: true,
    },
    {
      p: 'Pain hot-dog x12',
      q: '6 pq',
      auchan: 3.1,
      carrefour: 2.9,
      leclerc: 2.75,
      best: 'Leclerc',
      checked: true,
    },
    {
      p: 'Moutarde Amora 270g',
      q: '2 pc',
      auchan: 1.85,
      carrefour: 1.95,
      leclerc: 1.79,
      best: 'Leclerc',
      checked: true,
    },
    {
      p: 'Oignons frits 100g',
      q: '3 pc',
      auchan: 1.45,
      carrefour: 1.5,
      leclerc: 1.55,
      best: 'Auchan',
      checked: true,
    },
    {
      p: 'Frites surgelées 1kg',
      q: '5 sc',
      auchan: 2.8,
      carrefour: 2.65,
      leclerc: 2.4,
      best: 'Leclerc',
      checked: false,
    },
    {
      p: 'Bière blonde 25cl x24',
      q: '2 pq',
      auchan: 12.9,
      carrefour: 13.5,
      leclerc: 11.95,
      best: 'Leclerc',
      checked: false,
    },
  ];

  protected readonly vouchers: readonly Voucher[] = [
    { e: 'Leclerc', v: 50, expire: '30/06/2026', cond: 'à partir de 80 €', warn: false },
    { e: 'Auchan', v: 25, expire: '15/04/2026', cond: 'aucune', warn: false },
    { e: 'Carrefour', v: 10, expire: '12/02/2026', cond: 'urgent · expire ce soir', warn: true },
  ];

  protected formatPrice(n: number): string {
    return n.toFixed(2).replace('.', ',');
  }

  protected enseignePriceClass(
    name: 'Auchan' | 'Carrefour' | 'Leclerc',
    best: CartLine['best'],
  ): string {
    return best === name ? 'text-ok font-semibold' : 'text-muted';
  }
}

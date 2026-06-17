import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  LucideArrowUp,
  LucideCheck,
  LucideClock,
  LucideDownload,
  LucideDynamicIcon,
  LucideFilter,
  LucideIconInput,
  LucideMoreHorizontal,
  LucideQrCode,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Field } from '#shared/components/ui/field/field';
import { Input } from '#shared/components/ui/input/input';

interface Tx {
  readonly id: string;
  readonly d: string;
  readonly l: string;
  readonly m: string;
  readonly a: number;
  readonly k: 'ok' | 'pending' | 'refund';
  readonly who: string;
}

@Component({
  selector: 'bfd-paiements',
  imports: [Btn, Badge, Field, Input, LucideDynamicIcon],
  templateUrl: './paiements.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Paiements {
  constructor() {
    inject(PageHeaderService).set({
      title: 'Paiements',
      subtitle: 'Soirée en cours · encaissé en direct',
      breadcrumb: ['Soirée', 'Paiements'],
      activeNavId: 'pay',
    });
  }

  protected readonly icFilter = LucideFilter;
  protected readonly icDownload = LucideDownload;
  protected readonly icQr = LucideQrCode;
  protected readonly icMore = LucideMoreHorizontal;
  protected readonly icCheck = LucideCheck;

  protected readonly kpis = [
    {
      label: 'Encaissé ce soir',
      value: '628,50 €',
      delta: "+ 12,00 € · à l'instant",
      deltaClass: 'text-ok',
    },
    {
      label: 'Lydia online',
      value: '218,00 €',
      delta: '34 transactions',
      deltaClass: 'text-muted',
    },
    {
      label: 'QR sur place',
      value: '342,50 €',
      delta: '57 transactions',
      deltaClass: 'text-muted',
    },
    { label: 'Espèces', value: '68,00 €', delta: '12 transactions', deltaClass: 'text-muted' },
  ];

  protected readonly transactions: readonly Tx[] = [
    {
      id: 'BAE-2026-0218',
      d: '12/02 · 21:14',
      l: 'Précommande · Pack solo',
      m: 'Lydia online',
      a: 8.5,
      k: 'ok',
      who: 'Manon B.',
    },
    {
      id: 'BAE-2026-0217',
      d: '12/02 · 21:11',
      l: 'Caisse · Soirée Hivernale',
      m: 'QR Lydia',
      a: 12.0,
      k: 'ok',
      who: 'anon.',
    },
    {
      id: 'BAE-2026-0216',
      d: '12/02 · 21:08',
      l: 'Caisse · Soirée Hivernale',
      m: 'Espèces',
      a: 5.0,
      k: 'ok',
      who: 'anon.',
    },
    {
      id: 'BAE-2026-0215',
      d: '12/02 · 21:05',
      l: 'Cotisation 2026',
      m: 'CB',
      a: 15.0,
      k: 'ok',
      who: 'Tom B.',
    },
    {
      id: 'BAE-2026-0214',
      d: '12/02 · 20:58',
      l: 'Précommande · Hot-dog x2',
      m: 'Lydia online',
      a: 6.0,
      k: 'pending',
      who: 'Léo D.',
    },
    {
      id: 'BAE-2026-0213',
      d: '12/02 · 20:54',
      l: 'Caisse · annulée',
      m: 'QR Lydia',
      a: 4.5,
      k: 'refund',
      who: 'anon.',
    },
    {
      id: 'BAE-2026-0212',
      d: '12/02 · 20:51',
      l: 'Caisse · Soirée Hivernale',
      m: 'QR Lydia',
      a: 9.0,
      k: 'ok',
      who: 'anon.',
    },
  ];

  protected formatPrice(n: number): string {
    return n.toFixed(2).replace('.', ',');
  }

  protected txBgClass(k: Tx['k']): string {
    return k === 'ok'
      ? 'bg-ok-soft text-ok'
      : k === 'pending'
        ? 'bg-warn-soft text-warn'
        : 'bg-danger-soft text-danger';
  }

  protected txIcon(k: Tx['k']): LucideIconInput {
    return k === 'ok' ? LucideCheck : k === 'pending' ? LucideClock : LucideArrowUp;
  }

  protected txAmountClass(k: Tx['k']): string {
    return k === 'refund' ? 'text-danger' : 'text-text';
  }

  // Deterministic fake-QR pattern: 17×17 grid of booleans, with finder squares in 3 corners.
  protected readonly qrPattern = (() => {
    const blocks = 17;
    const cells: boolean[] = [];
    let seed = 1234;
    const rnd = (): number => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let y = 0; y < blocks; y++) {
      for (let x = 0; x < blocks; x++) {
        const corner = (x < 7 && y < 7) || (x >= blocks - 7 && y < 7) || (x < 7 && y >= blocks - 7);
        const inner =
          (x >= 1 && x <= 5 && y >= 1 && y <= 5) ||
          (x >= blocks - 6 && x <= blocks - 2 && y >= 1 && y <= 5) ||
          (x >= 1 && x <= 5 && y >= blocks - 6 && y <= blocks - 2);
        const center =
          (x >= 2 && x <= 4 && y >= 2 && y <= 4) ||
          (x >= blocks - 5 && x <= blocks - 3 && y >= 2 && y <= 4) ||
          (x >= 2 && x <= 4 && y >= blocks - 5 && y <= blocks - 3);
        let on = rnd() > 0.55;
        if (corner) on = !inner || center;
        cells.push(on);
      }
    }
    return () => cells;
  })();
}

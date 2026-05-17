import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  LucideCheck,
  LucideCreditCard,
  LucideDownload,
  LucideDynamicIcon,
  LucideIconInput,
  LucideLock,
  LucideQrCode,
  LucideScanLine,
  LucideTriangleAlert,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Card } from '#shared/components/ui/card/card';
import { Field } from '#shared/components/ui/field/field';

interface Denom {
  readonly v: number;
  readonly type: 'b' | 'p';
  count: number;
}

interface RecRow {
  readonly k: string;
  readonly v: string;
  readonly c: 'plus' | 'minus' | 'mono';
}

interface Channel {
  readonly k: string;
  readonly v: string;
  readonly sub: string;
  readonly cls: string;
  readonly icon: LucideIconInput;
}

interface Step {
  readonly n: string;
  readonly l: string;
  readonly t: string;
  readonly status: 'done' | 'cur' | 'pending';
}

@Component({
  selector: 'bfd-caisse-cloture',
  imports: [Btn, Card, Field, LucideDynamicIcon],
  templateUrl: './cloture.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaisseCloture {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  constructor() {
    this.pageHeader.set({
      title: 'Clôture de caisse · Z',
      subtitle: 'Soirée Hivernale · 14 fév. · clôture en cours par Léa M.',
      breadcrumb: ['Soirée', 'Caisse', 'Clôture Z'],
      activeNavId: 'cmd',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  protected readonly icDownload = LucideDownload;
  protected readonly icLock = LucideLock;
  protected readonly icCheck = LucideCheck;
  protected readonly icScan = LucideScanLine;
  protected readonly icAlert = LucideTriangleAlert;
  protected readonly icQr = LucideQrCode;
  protected readonly icCreditCard = LucideCreditCard;

  protected readonly steps: readonly Step[] = [
    { n: '1', l: 'Ouverture', t: '19:14', status: 'done' },
    { n: '2', l: 'Service', t: '21:48', status: 'done' },
    { n: '3', l: 'Comptage espèces', t: '—', status: 'cur' },
    { n: '4', l: 'Réconciliation', t: '—', status: 'pending' },
    { n: '5', l: 'Z final', t: '—', status: 'pending' },
  ];

  protected readonly denoms = signal<readonly Denom[]>([
    { v: 50, type: 'b', count: 2 },
    { v: 20, type: 'b', count: 11 },
    { v: 10, type: 'b', count: 18 },
    { v: 5, type: 'b', count: 24 },
    { v: 2, type: 'p', count: 16 },
    { v: 1, type: 'p', count: 22 },
    { v: 0.5, type: 'p', count: 28 },
    { v: 0.2, type: 'p', count: 14 },
    { v: 0.1, type: 'p', count: 6 },
  ]);

  protected readonly billets = computed(() => this.denoms().filter((d) => d.type === 'b'));
  protected readonly pieces = computed(() => this.denoms().filter((d) => d.type === 'p'));

  protected readonly cashCounted = computed(() =>
    this.denoms().reduce((s, d) => s + d.v * d.count, 0),
  );

  protected readonly opening = 80.0;
  protected readonly expected = 712.8;
  protected readonly diff = computed(() => +(this.cashCounted() - this.expected).toFixed(2));

  protected readonly recRows: readonly RecRow[] = [
    { k: 'Fond de caisse (ouverture)', v: '80,00', c: 'mono' },
    { k: '+ Ventes espèces', v: '+ 591,30', c: 'plus' },
    { k: '+ Pourboires', v: '+ 12,50', c: 'plus' },
    { k: '− Remboursements', v: '− 5,00', c: 'minus' },
    { k: '− Retraits', v: '− 60,00', c: 'minus' },
  ];

  protected readonly channels: readonly Channel[] = [
    { k: 'Lydia / QR', v: '482,50 €', sub: '54 paiements', cls: 'text-blue', icon: LucideQrCode },
    { k: 'Carte bleue', v: '215,00 €', sub: '8 paiements', cls: 'text-red', icon: LucideCreditCard },
    {
      k: 'Précommandes (déjà payées)',
      v: '318,00 €',
      sub: 'réglées en amont',
      cls: 'text-ok',
      icon: LucideCheck,
    },
  ];

  protected denomLabel(d: Denom): string {
    if (d.v < 1) return `${(d.v * 100).toFixed(0)} c`;
    return `${d.v} €`;
  }

  protected denomTotal(d: Denom): string {
    return (d.v * d.count).toFixed(2).replace('.', ',');
  }

  protected inc(v: number): void {
    this.denoms.update((arr) => arr.map((d) => (d.v === v ? { ...d, count: d.count + 1 } : d)));
  }

  protected dec(v: number): void {
    this.denoms.update((arr) =>
      arr.map((d) => (d.v === v ? { ...d, count: Math.max(0, d.count - 1) } : d)),
    );
  }

  protected setCount(v: number, ev: Event): void {
    const n = parseInt((ev.target as HTMLInputElement).value, 10) || 0;
    this.denoms.update((arr) => arr.map((d) => (d.v === v ? { ...d, count: Math.max(0, n) } : d)));
  }

  protected diffStyles(): { bg: string; border: string; text: string } {
    const d = this.diff();
    if (d < -1) return { bg: 'bg-danger-soft', border: 'border-danger', text: 'text-danger' };
    if (d > 1) return { bg: 'bg-warn-soft', border: 'border-warn', text: 'text-warn' };
    return { bg: 'bg-ok-soft', border: 'border-ok', text: 'text-ok' };
  }

  protected stepCircleClass(s: Step['status']): string {
    if (s === 'done') return 'bg-ok text-white border-0';
    if (s === 'cur') return 'bg-blue text-white border-0';
    return 'bg-surface-2 text-muted border border-border';
  }

  protected formatMoney(v: number): string {
    return v.toFixed(2).replace('.', ',');
  }
}

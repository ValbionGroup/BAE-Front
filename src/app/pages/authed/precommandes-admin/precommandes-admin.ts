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
  LucideChevronRight,
  LucideClock,
  LucideDynamicIcon,
  LucideEuro,
  LucideFunnel,
  LucideQrCode,
  LucideScanLine,
  LucideTriangleAlert,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';
import { Card } from '#shared/components/ui/card/card';
import { Input } from '#shared/components/ui/input/input';

type Status = 'pret' | 'encours' | 'attente';

interface OrderItem {
  readonly n: string;
  readonly q: number;
  readonly p: number;
  done: boolean;
}

interface Order {
  readonly id: string;
  readonly client: string;
  readonly fullClient: string;
  readonly adh: string;
  readonly items: number;
  readonly prix: number;
  readonly paye: string;
  readonly payeDetail: string;
  readonly slot: string;
  readonly slotDetail: string;
  readonly q: string;
  readonly allergy?: string;
  status: Status;
  picking: OrderItem[];
}

interface Pickup {
  readonly id: string;
  readonly n: string;
  readonly t: string;
  readonly ok: boolean;
}

interface SlotGroup {
  readonly label: string;
  readonly imminent: boolean;
  readonly orders: readonly Order[];
}

@Component({
  selector: 'bfd-precommandes-admin',
  imports: [Btn, Badge, Card, Input, LucideDynamicIcon],
  templateUrl: './precommandes-admin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrecommandesAdmin {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  constructor() {
    this.pageHeader.set({
      title: 'Précommandes · gestion interne',
      subtitle: 'Soirée Hivernale · 47 commandes · 12 prêtes · 8 en prépa',
      breadcrumb: ['Soirée', 'Précommandes', 'Gestion'],
      activeNavId: 'pre',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  protected readonly icFilter = LucideFunnel;
  protected readonly icScan = LucideScanLine;
  protected readonly icCheck = LucideCheck;
  protected readonly icChevRight = LucideChevronRight;
  protected readonly icClock = LucideClock;
  protected readonly icEuro = LucideEuro;
  protected readonly icQr = LucideQrCode;
  protected readonly icAlert = LucideTriangleAlert;

  protected readonly orders = signal<readonly Order[]>([
    {
      id: '#PC-0142',
      client: 'C. Renard',
      fullClient: 'Camille Renard',
      adh: 'ADH-2025-0142',
      items: 3,
      prix: 14.5,
      paye: 'Lydia',
      payeDetail: 'Lydia · 19:02',
      slot: '19:30',
      slotDetail: '19:30 — 19:45',
      status: 'pret',
      q: 'A12',
      picking: [
        { n: 'Hot-dog classique', q: 2, p: 3.5, done: true },
        { n: 'Frites', q: 1, p: 2.5, done: true },
        { n: 'Coca 33cl', q: 1, p: 1.5, done: true },
      ],
    },
    {
      id: '#PC-0141',
      client: 'A. Picard',
      fullClient: 'Antoine Picard',
      adh: 'ADH-2025-0118',
      items: 2,
      prix: 7.0,
      paye: 'Lydia',
      payeDetail: 'Lydia · 19:05',
      slot: '19:30',
      slotDetail: '19:30 — 19:45',
      status: 'pret',
      q: 'A11',
      picking: [
        { n: 'Hot-dog classique', q: 1, p: 3.5, done: true },
        { n: 'Heineken 33cl', q: 1, p: 3.5, done: true },
      ],
    },
    {
      id: '#PC-0140',
      client: 'M. Bensaid',
      fullClient: 'Marwane Bensaid',
      adh: 'ADH-2025-0203',
      items: 5,
      prix: 19.5,
      paye: 'Lydia',
      payeDetail: 'Lydia · 19:14',
      slot: '19:45',
      slotDetail: '19:45 — 20:00',
      status: 'encours',
      q: 'A09',
      allergy: 'Allergie noix · remplacer la sauce noix du veggie par moutarde',
      picking: [
        { n: 'Hot-dog classique', q: 2, p: 3.5, done: true },
        { n: 'Hot-dog veggie', q: 1, p: 3.5, done: true },
        { n: 'Coca 33cl', q: 1, p: 1.5, done: false },
        { n: 'Crêpe Nutella', q: 1, p: 2.0, done: false },
      ],
    },
    {
      id: '#PC-0139',
      client: 'E. Vasseur',
      fullClient: 'Élise Vasseur',
      adh: 'ADH-2025-0089',
      items: 1,
      prix: 3.5,
      paye: 'CB',
      payeDetail: 'CB · 19:20',
      slot: '19:45',
      slotDetail: '19:45 — 20:00',
      status: 'encours',
      q: 'A08',
      picking: [{ n: 'Hot-dog fromage', q: 1, p: 3.5, done: false }],
    },
    {
      id: '#PC-0138',
      client: 'I. Dubreuil',
      fullClient: 'Inès Dubreuil',
      adh: 'ADH-2025-0156',
      items: 4,
      prix: 13.0,
      paye: 'Lydia',
      payeDetail: 'Lydia · 18:48',
      slot: '20:00',
      slotDetail: '20:00 — 20:15',
      status: 'attente',
      q: 'A07',
      picking: [
        { n: 'Hot-dog classique', q: 2, p: 3.5, done: false },
        { n: 'Frites', q: 1, p: 2.5, done: false },
        { n: 'Heineken 33cl', q: 1, p: 3.5, done: false },
      ],
    },
    {
      id: '#PC-0137',
      client: 'T. Bessière',
      fullClient: 'Tom Bessière',
      adh: 'ADH-2025-0044',
      items: 2,
      prix: 6.0,
      paye: 'CB',
      payeDetail: 'CB · 18:50',
      slot: '20:00',
      slotDetail: '20:00 — 20:15',
      status: 'attente',
      q: 'A06',
      picking: [
        { n: 'Hot-dog veggie', q: 1, p: 3.5, done: false },
        { n: 'Coca 33cl', q: 1, p: 2.5, done: false },
      ],
    },
    {
      id: '#PC-0136',
      client: 'P. Aubry',
      fullClient: 'Pierre Aubry',
      adh: 'EXT-2025-0011',
      items: 3,
      prix: 11.5,
      paye: 'Lydia',
      payeDetail: 'Lydia · 19:01',
      slot: '20:00',
      slotDetail: '20:00 — 20:15',
      status: 'attente',
      q: 'A05',
      picking: [
        { n: 'Hot-dog fromage', q: 1, p: 3.5, done: false },
        { n: 'Hot-dog classique', q: 1, p: 3.5, done: false },
        { n: 'Crêpe Nutella', q: 1, p: 2.0, done: false },
      ],
    },
    {
      id: '#PC-0135',
      client: 'S. Lemaire',
      fullClient: 'Sofia Lemaire',
      adh: 'ADH-2024-0871',
      items: 2,
      prix: 8.0,
      paye: 'CB',
      payeDetail: 'CB · 19:24',
      slot: '20:15',
      slotDetail: '20:15 — 20:30',
      status: 'attente',
      q: 'A04',
      picking: [
        { n: 'Hot-dog moutarde', q: 2, p: 3.5, done: false },
        { n: 'Soft maison', q: 1, p: 1.0, done: false },
      ],
    },
  ]);

  protected readonly selectedId = signal<string>('#PC-0140');

  protected readonly selected = computed<Order | undefined>(() =>
    this.orders().find((o) => o.id === this.selectedId()),
  );

  protected readonly slotGroups = computed<readonly SlotGroup[]>(() => {
    const slots = [
      { time: '19:30', label: '19:30 · imminent', imminent: true },
      { time: '19:45', label: '19:45 · dans 14 min', imminent: false },
      { time: '20:00', label: '20:00 · dans 29 min', imminent: false },
      { time: '20:15', label: '20:15 · dans 44 min', imminent: false },
    ];
    return slots
      .map((s) => ({
        label: s.label,
        imminent: s.imminent,
        orders: this.orders().filter((o) => o.slot === s.time),
      }))
      .filter((g) => g.orders.length > 0);
  });

  protected readonly orderTotal = computed<number>(() => {
    const s = this.selected();
    if (!s) return 0;
    return s.picking.reduce((acc, i) => acc + i.q * i.p, 0);
  });

  protected readonly doneCount = computed<number>(
    () => this.selected()?.picking.filter((i) => i.done).length ?? 0,
  );

  protected readonly totalCount = computed<number>(() => this.selected()?.picking.length ?? 0);

  protected readonly pickups: readonly Pickup[] = [
    { id: 'A11', n: 'A. Picard', t: 'il y a 22 s', ok: true },
    { id: 'A10', n: 'L. Dubois', t: 'il y a 2 min', ok: true },
    { id: 'A08', n: 'E. Vasseur', t: 'il y a 4 min', ok: true },
    { id: 'A03', n: 'F. Henry', t: 'pas adhérent', ok: false },
  ];

  protected readonly filters = ['Toutes · 47', 'Prêtes · 12', 'En prépa · 8', 'Att. · 27'];
  protected readonly activeFilter = signal(0);

  protected select(id: string): void {
    this.selectedId.set(id);
  }

  protected statusBadge(s: Status): { label: string; kind: BadgeKind; dot: boolean } {
    if (s === 'pret') return { label: 'Prête', kind: 'ok', dot: true };
    if (s === 'encours') return { label: 'En prépa', kind: 'warn', dot: true };
    return { label: 'En attente', kind: 'ghost', dot: false };
  }

  protected formatMoney(v: number): string {
    return v.toFixed(2).replace('.', ',');
  }

  /** Toggle done on a picking item of the currently selected order. */
  protected toggleItem(idx: number): void {
    const id = this.selectedId();
    this.orders.update((arr) =>
      arr.map((o) => {
        if (o.id !== id) return o;
        const next = o.picking.map((it, i) => (i === idx ? { ...it, done: !it.done } : it));
        const allDone = next.every((i) => i.done);
        const anyDone = next.some((i) => i.done);
        const nextStatus: Status = allDone ? 'pret' : anyDone ? 'encours' : 'attente';
        return { ...o, picking: next, status: nextStatus };
      }),
    );
  }

  /** Force the selected order's status to `pret` and mark every item done. */
  protected markReady(): void {
    const id = this.selectedId();
    this.orders.update((arr) =>
      arr.map((o) => {
        if (o.id !== id) return o;
        return {
          ...o,
          status: 'pret' as Status,
          picking: o.picking.map((it) => ({ ...it, done: true })),
        };
      }),
    );
  }

  /** Move selected back to `attente` and clear all done flags. */
  protected hold(): void {
    const id = this.selectedId();
    this.orders.update((arr) =>
      arr.map((o) => {
        if (o.id !== id) return o;
        return {
          ...o,
          status: 'attente' as Status,
          picking: o.picking.map((it) => ({ ...it, done: false })),
        };
      }),
    );
  }

  protected cancel(): void {
    const id = this.selectedId();
    this.orders.update((arr) => arr.filter((o) => o.id !== id));
    const first = this.orders()[0];
    if (first) this.selectedId.set(first.id);
  }
}

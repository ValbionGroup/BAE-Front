import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  LucideBell,
  LucideCheck,
  LucideClock,
  LucideDynamicIcon,
  LucideIconInput,
  LucideLock,
  LucideScanLine,
  LucideTriangleAlert,
  LucideX,
  LucideZap,
} from '@lucide/angular';
import { Router } from '@angular/router';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';

type TicketStatus = 'waiting' | 'preparing' | 'ready';

interface TicketItem {
  readonly q: number;
  readonly n: string;
  done: boolean;
}

interface Ticket {
  readonly id: string;
  readonly client: string;
  readonly type: 'place' | 'precom';
  readonly enteredAt: number; // ms timestamp when ticket entered current column
  readonly items: readonly TicketItem[];
  readonly warn?: string;
  call?: boolean;
}

interface Kpi {
  readonly l: string;
  readonly v: string;
  readonly s: string;
  readonly cls: string;
  readonly big?: boolean;
  readonly hl?: boolean;
}

interface Tx {
  readonly t: string;
  readonly m: string;
  readonly v: number;
  readonly items: string;
}

interface Alert {
  readonly k: 'danger' | 'warn';
  readonly icon: LucideIconInput;
  readonly t: string;
  readonly s: string;
}

interface StockRow {
  readonly p: string;
  readonly q: string;
  readonly warn: boolean;
  readonly rest: string;
}

const SERVICE_START = '19:30';
const SERVICE_END_HOURS = 23;

// Helpers to build mock tickets with relative timestamps. Each value is the
// number of seconds the ticket has already spent in its current column —
// timers tick forward from there.
function mkTicket(
  id: string,
  client: string,
  type: Ticket['type'],
  ageSeconds: number,
  items: ReadonlyArray<{ q: number; n: string; done?: boolean }>,
  extras: { warn?: string; call?: boolean } = {},
): Ticket {
  return {
    id,
    client,
    type,
    enteredAt: Date.now() - ageSeconds * 1000,
    items: items.map((i) => ({ q: i.q, n: i.n, done: !!i.done })),
    ...extras,
  };
}

@Component({
  selector: 'bfd-soiree-live',
  imports: [Btn, Badge, LucideDynamicIcon],
  templateUrl: './live.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoireeLive {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly router = inject(Router);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');
  private readonly destroyRef = inject(DestroyRef);

  protected closeNight(): void {
    this.router.navigate(['/soiree/bilan']);
  }

  constructor() {
    this.pageHeader.set({
      title: 'Soirée · vue live',
      subtitle: 'Soirée Hivernale · pilotage temps réel',
      breadcrumb: ['Soirée', 'Pilotage live'],
      activeNavId: 'soir',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });

    const interval = setInterval(() => this.now.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(interval));
  }

  protected readonly icBell = LucideBell;
  protected readonly icScan = LucideScanLine;
  protected readonly icLock = LucideLock;
  protected readonly icCheck = LucideCheck;
  protected readonly icX = LucideX;
  protected readonly icZap = LucideZap;
  protected readonly icClock = LucideClock;
  protected readonly icAlert = LucideTriangleAlert;

  protected readonly now = signal<number>(Date.now());

  /** Wall-clock formatted "HH:MM" — re-evaluates every second. */
  protected readonly wallClock = computed(() => {
    const d = new Date(this.now());
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  /** Rough "X h Y restantes" until SERVICE_END_HOURS. */
  protected readonly timeRemaining = computed(() => {
    const d = new Date(this.now());
    const end = new Date(d);
    end.setHours(SERVICE_END_HOURS, 0, 0, 0);
    if (end.getTime() <= d.getTime()) return '· terminé';
    const mins = Math.floor((end.getTime() - d.getTime()) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `· ${h}h ${String(m).padStart(2, '0')} restantes`;
  });

  protected readonly waiting = signal<readonly Ticket[]>([
    mkTicket('A15', 'C. Renard', 'place', 18, [
      { q: 2, n: 'Hot-dog classique' },
      { q: 1, n: 'Heineken 33cl' },
    ]),
    mkTicket('A14', 'J. Petit', 'place', 48, [{ q: 1, n: 'Crêpe Nutella' }]),
    mkTicket('A13', 'L. Bernard', 'precom', 62, [
      { q: 2, n: 'Hot-dog fromage' },
      { q: 1, n: 'Frites maxi' },
      { q: 1, n: 'Coca 33cl' },
    ]),
    mkTicket('A12', 'S. Lemaire', 'precom', 94, [
      { q: 2, n: 'Hot-dog moutarde' },
      { q: 1, n: 'Soft maison' },
    ]),
  ]);

  protected readonly preparing = signal<readonly Ticket[]>([
    mkTicket('A11', 'A. Picard', 'precom', 134, [
      { q: 1, n: 'Hot-dog classique', done: true },
      { q: 1, n: 'Heineken 33cl', done: true },
    ]),
    mkTicket('A10', 'E. Vasseur', 'place', 222, [
      { q: 1, n: 'Hot-dog fromage', done: true },
    ]),
    mkTicket(
      'A09',
      'M. Bensaid',
      'precom',
      288,
      [
        { q: 2, n: 'Hot-dog classique', done: true },
        { q: 1, n: 'Hot-dog veggie' },
        { q: 1, n: 'Coca 33cl', done: true },
        { q: 1, n: 'Crêpe Nutella' },
      ],
      { warn: 'Allergie noix · sauce moutarde uniquement' },
    ),
    mkTicket('A06', 'T. Bessière', 'precom', 384, [
      { q: 1, n: 'Hot-dog veggie' },
      { q: 1, n: 'Frites' },
    ]),
  ]);

  protected readonly ready = signal<readonly Ticket[]>([
    mkTicket('A08', 'I. Dubreuil', 'precom', 24, [
      { q: 2, n: 'Hot-dog classique', done: true },
      { q: 2, n: 'Heineken 33cl', done: true },
    ]),
    mkTicket('A07', 'P. Aubry', 'precom', 78, [
      { q: 1, n: 'Hot-dog fromage', done: true },
      { q: 1, n: 'Frites', done: true },
      { q: 1, n: 'Coca 33cl', done: true },
    ]),
    mkTicket('A05', 'F. Henry', 'place', 162, [{ q: 1, n: 'Crêpe sucre', done: true }], {
      call: true,
    }),
  ]);

  /** Quick lookup so the host KPI strip reflects mutations. */
  protected readonly waitingCount = computed(() => this.waiting().length);
  protected readonly preparingCount = computed(() => this.preparing().length);
  protected readonly readyCount = computed(() => this.ready().length);
  protected readonly totalActive = computed(
    () => this.waitingCount() + this.preparingCount() + this.readyCount(),
  );

  protected readonly kpis = computed<readonly Kpi[]>(() => [
    { l: 'Heure', v: this.wallClock(), s: this.timeRemaining(), cls: 'text-text' },
    { l: 'Encaissé live', v: '1 736,50 €', s: '+12 € · dernière min.', cls: 'text-ok', big: true },
    { l: 'Commandes', v: '187', s: '4,2 / min', cls: 'text-text' },
    {
      l: 'En cuisine',
      v: String(this.totalActive()),
      s: `${this.waitingCount()} attente · ${this.preparingCount()} prépa · ${this.readyCount()} prêtes`,
      cls: 'text-warn',
      hl: true,
    },
    { l: 'Temps moy.', v: '3:18', s: 'cible < 4 min', cls: 'text-ok' },
    { l: 'Marge live', v: '64%', s: 'objectif 60%+', cls: 'text-ok' },
  ]);

  protected readonly cadence = [
    20, 38, 52, 78, 95, 118, 142, 168, 188, 162, 154, 148, 132, 124, 138, 142, 158, 172, 160, 144, 132,
  ];

  protected readonly transactions: readonly Tx[] = [
    { t: '21:14', m: 'Lydia', v: 6.0, items: 'Hot-dog · Coca' },
    { t: '21:14', m: 'CB', v: 3.5, items: 'Hot-dog classique' },
    { t: '21:13', m: 'Espèces', v: 2.5, items: 'Heineken' },
    { t: '21:13', m: 'Lydia', v: 12.5, items: 'Pack soirée ×2' },
    { t: '21:13', m: 'Lydia', v: 4.0, items: 'Hot-dog fromage' },
    { t: '21:12', m: 'Précom.', v: 14.5, items: 'A11 · Picard' },
    { t: '21:12', m: 'CB', v: 8.0, items: 'Hot-dog ×2 · Coca' },
  ];

  protected readonly alerts: readonly Alert[] = [
    {
      k: 'danger',
      icon: LucideTriangleAlert,
      t: 'Stock saucisses critique',
      s: '< 15 min de service · à reprendre',
    },
    {
      k: 'warn',
      icon: LucideClock,
      t: 'A06 · 6:24 sans validation',
      s: 'Au-delà du seuil cuisine de 5 min',
    },
  ];

  protected readonly lowStock: readonly StockRow[] = [
    { p: 'Saucisses Strasbourg', q: '14', warn: true, rest: '~45 min' },
    { p: 'Pain hot-dog', q: '12', warn: true, rest: '~50 min' },
    { p: 'Heineken 33cl', q: '38', warn: false, rest: '~2 h' },
  ];

  protected readonly serviceStart = SERVICE_START;

  /** Live elapsed time in current column, formatted mm:ss. Reads `now()` so
   *  the cell re-renders every tick. */
  protected elapsed(t: Ticket): string {
    const secs = Math.max(0, Math.floor((this.now() - t.enteredAt) / 1000));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  protected elapsedSeconds(t: Ticket): number {
    return Math.max(0, Math.floor((this.now() - t.enteredAt) / 1000));
  }

  protected isUrgent(t: Ticket, status: TicketStatus): boolean {
    if (status === 'ready') return false;
    return this.elapsedSeconds(t) >= 5 * 60;
  }

  protected isWatch(t: Ticket, status: TicketStatus): boolean {
    if (status === 'ready') return false;
    const tot = this.elapsedSeconds(t);
    return tot >= 3 * 60 && tot < 5 * 60;
  }

  protected ticketBg(t: Ticket, status: TicketStatus): string {
    if (status === 'ready') return 'bg-ok-soft/40';
    if (this.isUrgent(t, status)) return 'bg-danger-soft/30';
    return 'bg-surface';
  }

  protected ticketBorder(t: Ticket, status: TicketStatus): string {
    if (this.isUrgent(t, status)) return 'border-danger';
    if (status === 'ready') return 'border-ok';
    return 'border-border-s';
  }

  protected ticketAccent(t: Ticket, status: TicketStatus): string {
    if (status === 'ready') return 'bg-ok';
    if (this.isUrgent(t, status)) return 'bg-danger';
    if (status === 'preparing') return 'bg-warn';
    return 'bg-muted';
  }

  protected typeKind(t: Ticket): BadgeKind {
    return t.type === 'precom' ? 'blue' : 'neutral';
  }

  protected typeLabel(t: Ticket): string {
    return t.type === 'precom' ? 'Précomm.' : 'Sur place';
  }

  protected doneCount(t: Ticket): number {
    return t.items.filter((i) => i.done).length;
  }

  protected progressKind(t: Ticket, status: TicketStatus): BadgeKind {
    if (this.isUrgent(t, status)) return 'danger';
    if (this.isWatch(t, status)) return 'warn';
    return 'neutral';
  }

  protected timerColor(t: Ticket, status: TicketStatus): string {
    if (this.isUrgent(t, status)) return 'text-danger';
    if (this.isWatch(t, status)) return 'text-warn';
    if (status === 'ready') return 'text-ok';
    return 'text-text';
  }

  protected statusLabel(status: TicketStatus): string {
    if (status === 'ready') return 'prête';
    if (status === 'preparing') return 'en prépa';
    return 'attente';
  }

  protected pct(v: number): number {
    return (v / 200) * 100;
  }

  protected barOpacity(i: number, len: number, isCurrent: boolean): number {
    if (isCurrent) return 1;
    return 0.4 + (i / len) * 0.5;
  }

  /** Move a waiting ticket → preparing. Resets its timer to "just started." */
  protected start(t: Ticket): void {
    this.waiting.update((arr) => arr.filter((x) => x.id !== t.id));
    this.preparing.update((arr) => [...arr, { ...t, enteredAt: Date.now() }]);
  }

  /** Drop a ticket from any column. */
  protected cancel(t: Ticket, status: TicketStatus): void {
    if (status === 'waiting') this.waiting.update((a) => a.filter((x) => x.id !== t.id));
    else if (status === 'preparing')
      this.preparing.update((a) => a.filter((x) => x.id !== t.id));
    else this.ready.update((a) => a.filter((x) => x.id !== t.id));
  }

  /** Preparing → ready. Marks all items done so the ready ticket reads clean. */
  protected markReady(t: Ticket): void {
    this.preparing.update((arr) => arr.filter((x) => x.id !== t.id));
    const completed: Ticket = {
      ...t,
      enteredAt: Date.now(),
      items: t.items.map((i) => ({ ...i, done: true })),
    };
    this.ready.update((arr) => [...arr, completed]);
  }

  /** Ready → removed (client picked up). */
  protected handover(t: Ticket): void {
    this.ready.update((arr) => arr.filter((x) => x.id !== t.id));
  }

  /** Toggle a single item's done state in a preparing ticket. */
  protected toggleItem(t: Ticket, idx: number): void {
    this.preparing.update((arr) =>
      arr.map((x) => {
        if (x.id !== t.id) return x;
        return {
          ...x,
          items: x.items.map((it, i) => (i === idx ? { ...it, done: !it.done } : it)),
        };
      }),
    );
  }
}

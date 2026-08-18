import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toString as qrToString } from 'qrcode';
import { LucideCheck, LucideClock, LucideDynamicIcon } from '@lucide/angular';
import { API_BASE_URL, Badge, Btn, Card, Skeleton, formatCents, messageOf } from '@bae/ui';

import type { LoadingStatus } from '../../core/catalog.models';
import type { MyPreOrder } from '../../core/purchases.store';

/**
 * ⚠️ SVG et non PNG : le jeton fait ~490 caractères, donc un QR de version 17
 * (85×85 modules). Rastérisé à 220 px, chaque module tombait sous 3 px et se
 * brouillait encore sur un écran à forte densité. Le vecteur reste net quelle
 * que soit la taille d'affichage.
 */
function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface PreOrderQr {
  readonly token: string;
  readonly expiresAt: string;
  readonly ttlSeconds: number;
}

@Component({
  selector: 'bfp-commande',
  imports: [RouterLink, Btn, Badge, Card, Skeleton, LucideDynamicIcon],
  templateUrl: './commande.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Commande implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input.required<string>();

  protected readonly icCheck = LucideCheck;
  protected readonly icClock = LucideClock;

  protected readonly status = signal<LoadingStatus>('init');
  protected readonly preOrder = signal<MyPreOrder | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly qrDataUrl = signal<string | null>(null);
  protected readonly qrError = signal<string | null>(null);

  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.status.set('loading');
    this.destroyRef.onDestroy(() => clearTimeout(this.timer));

    this.http.get<MyPreOrder>(`${this.baseUrl}/account/pre-orders/${this.id()}`).subscribe({
      next: (preOrder) => {
        this.preOrder.set(preOrder);
        this.status.set('loaded');

        if (preOrder.status !== 'cancelled') this.refreshQr();
      },
      error: (error: unknown) => {
        this.error.set(messageOf(error, 'Cette précommande est introuvable.'));
        this.status.set('error');
      },
    });
  }

  protected refreshQr(): void {
    this.qrError.set(null);

    this.http.get<PreOrderQr>(`${this.baseUrl}/account/pre-orders/${this.id()}/qr`).subscribe({
      next: (qr) => {
        void qrToString(qr.token, { type: 'svg', margin: 1 }).then(
          (svg) => this.qrDataUrl.set(svgDataUrl(svg)),
          () => this.qrError.set('Le QR n’a pas pu être dessiné.'),
        );

        clearTimeout(this.timer);
        this.timer = setTimeout(
          () => this.refreshQr(),
          Math.max(5_000, (qr.ttlSeconds - 15) * 1000),
        );
      },
      error: (error: unknown) => {
        this.qrDataUrl.set(null);
        this.qrError.set(messageOf(error, 'Le QR de retrait n’a pas pu être émis.'));
      },
    });
  }

  protected pending(preOrder: MyPreOrder): number {
    return preOrder.lines.reduce(
      (total, line) => total + Math.max(0, line.quantity - line.receivedQuantity),
      0,
    );
  }

  protected isCollected(line: MyPreOrder['lines'][number]): boolean {
    return line.receivedQuantity >= line.quantity;
  }

  protected price(cents: number): string {
    return formatCents(cents);
  }

  protected dateOf(iso: string | null): string {
    if (iso === null) return '—';
    return format(new Date(iso), 'dd/MM/yyyy', { locale: fr });
  }
}

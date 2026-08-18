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
import { LucideCheck, LucideClock, LucideDynamicIcon } from '@lucide/angular';
import { API_BASE_URL, Badge, Btn, Card, QrCode, Skeleton, formatCents, messageOf } from '@bae/ui';

import type { LoadingStatus } from '../../core/catalog.models';
import type { MyPreOrder } from '../../core/purchases.store';

interface PreOrderQr {
  readonly token: string;
  readonly expiresAt: string;
  readonly ttlSeconds: number;
}

@Component({
  selector: 'bfp-commande',
  imports: [RouterLink, Btn, Badge, Card, QrCode, Skeleton, LucideDynamicIcon],
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

  protected readonly qrToken = signal<string | null>(null);
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
        this.qrToken.set(qr.token);

        clearTimeout(this.timer);
        this.timer = setTimeout(
          () => this.refreshQr(),
          Math.max(5_000, (qr.ttlSeconds - 15) * 1000),
        );
      },
      error: (error: unknown) => {
        this.qrToken.set(null);
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

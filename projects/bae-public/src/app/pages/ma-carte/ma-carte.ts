import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LucideBadgeCheck, LucideDynamicIcon } from '@lucide/angular';
import { API_BASE_URL, Badge, Btn, Card, QrCode, Skeleton, messageOf } from '@bae/ui';

import { PurchasesStore } from '../../core/purchases.store';
import { SessionStore } from '../../core/session.store';

interface IdentityQr {
  readonly token: string;
  readonly expiresAt: string;
  readonly ttlSeconds: number;
}

@Component({
  selector: 'bfp-ma-carte',
  imports: [RouterLink, Badge, Btn, Card, QrCode, Skeleton, LucideDynamicIcon],
  templateUrl: './ma-carte.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaCarte implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly session = inject(SessionStore);
  protected readonly purchases = inject(PurchasesStore);

  protected readonly icPass = LucideBadgeCheck;

  /** « Pas encore su » n'est pas « pas de cotisation ». */
  protected readonly pending = computed(
    () =>
      this.session.status() === 'unknown' ||
      this.purchases.subscriptionsStatus() === 'init' ||
      this.purchases.subscriptionsStatus() === 'loading',
  );

  protected readonly qrToken = signal<string | null>(null);
  protected readonly qrError = signal<string | null>(null);

  private timer?: ReturnType<typeof setTimeout>;
  /** Un booléen nu, pas un signal : le lire dans l'effet le relancerait. */
  private requested = false;

  constructor() {
    effect(() => {
      if (this.purchases.activeSubscription() === null || this.requested) return;
      this.requested = true;
      this.refreshQr();
    });
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => clearTimeout(this.timer));
    this.purchases.loadSubscriptions();
  }

  protected retrySubscriptions(): void {
    this.purchases.reloadSubscriptions();
  }

  protected refreshQr(): void {
    this.qrError.set(null);

    this.http.get<IdentityQr>(`${this.baseUrl}/account/qr`).subscribe({
      next: (qr) => {
        this.qrToken.set(qr.token);

        // Réémis avant l'échéance : un QR périmé au comptoir est le mode de
        // panne que le TTL court rend le plus probable.
        clearTimeout(this.timer);
        this.timer = setTimeout(
          () => this.refreshQr(),
          Math.max(5_000, (qr.ttlSeconds - 15) * 1000),
        );
      },
      error: (error: unknown) => {
        this.qrToken.set(null);
        this.qrError.set(messageOf(error, 'Le QR n’a pas pu être émis.'));
      },
    });
  }

  /**
   * `parseISO` et non `new Date` : une date sans heure part sinon en UTC pour
   * être réaffichée en heure locale, ce qui la recule d'un jour à l'ouest de
   * Greenwich. L'échéance vient du back en `YYYY-MM-DD`.
   */
  protected dateOf(iso: string): string {
    return format(parseISO(iso), 'dd/MM/yyyy', { locale: fr });
  }
}

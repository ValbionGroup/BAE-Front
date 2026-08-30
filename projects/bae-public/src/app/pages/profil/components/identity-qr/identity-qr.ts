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
import { API_BASE_URL, Btn, QrCode, messageOf } from '@bae/ui';

interface QrToken {
  readonly token: string;
  readonly expiresAt: string;
  readonly ttlSeconds: number;
}

/**
 * Le QR d'identité et son renouvellement. Il identifie son porteur au comptoir,
 * indépendamment de toute cotisation : `/account/qr` n'en demande aucune.
 */
@Component({
  selector: 'bfp-identity-qr',
  imports: [Btn, QrCode],
  templateUrl: './identity-qr.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdentityQr implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly destroyRef = inject(DestroyRef);

  readonly alt = input.required<string>();

  protected readonly token = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => clearTimeout(this.timer));
    this.refresh();
  }

  /**
   * Réémet avant l'échéance : un QR périmé au comptoir est le mode de panne que
   * le TTL court rend le plus probable.
   */
  protected refresh(): void {
    this.error.set(null);

    this.http.get<QrToken>(`${this.baseUrl}/account/qr`).subscribe({
      next: (qr) => {
        this.token.set(qr.token);

        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.refresh(), Math.max(5_000, (qr.ttlSeconds - 15) * 1000));
      },
      error: (error: unknown) => {
        this.token.set(null);
        this.error.set(messageOf(error, 'Le QR n’a pas pu être émis.'));
      },
    });
  }
}

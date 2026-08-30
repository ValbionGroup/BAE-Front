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

interface IdentityQr {
  readonly token: string;
  readonly expiresAt: string;
  readonly ttlSeconds: number;
}

/**
 * Le QR d'adhérent et son renouvellement. Le parent décide de l'afficher ou non :
 * monté, il émet aussitôt.
 */
@Component({
  selector: 'bfp-fastpass-qr',
  imports: [Btn, QrCode],
  templateUrl: './fastpass-qr.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FastpassQr implements OnInit {
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

    this.http.get<IdentityQr>(`${this.baseUrl}/account/qr`).subscribe({
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

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { toDataURL } from 'qrcode';
import { BuyersService } from '#core/services/buyers/buyers-service';
import { messageOf } from '#shared/utils/api-error';
import { Btn } from '#shared/components/ui/btn/btn';

/**
 * Le QR d'identité de la personne connectée, à présenter au comptoir.
 *
 * Le jeton est court par construction (180 s) pour qu'une capture d'écran ne
 * vaille rien : la carte le renouvelle donc d'elle-même un peu avant l'échéance,
 * plutôt que d'afficher un code mort en silence.
 */
@Component({
  selector: 'bfd-my-qr-card',
  imports: [Btn],
  templateUrl: './my-qr-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyQrCard implements OnInit {
  private readonly buyers = inject(BuyersService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly dataUrl = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    void this.refresh();
    this.destroyRef.onDestroy(() => clearTimeout(this.timer));
  }

  protected async refresh(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const qr = await lastValueFrom(this.buyers.myQr());
      this.dataUrl.set(await toDataURL(qr.token, { margin: 1, width: 220 }));

      // Un peu avant l'expiration, jamais après : un QR périmé au comptoir se
      // lit comme une panne, pas comme une sécurité.
      clearTimeout(this.timer);
      this.timer = setTimeout(
        () => void this.refresh(),
        Math.max(5_000, (qr.ttlSeconds - 15) * 1000),
      );
    } catch (error: unknown) {
      this.error.set(messageOf(error, 'Le QR n’a pas pu être généré.'));
    } finally {
      this.loading.set(false);
    }
  }
}

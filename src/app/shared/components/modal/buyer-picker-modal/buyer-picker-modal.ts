import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { LucideUserSearch } from '@lucide/angular';
import { lastValueFrom } from 'rxjs';
import { Btn } from '#shared/components/ui/btn/btn';
import { Field } from '#shared/components/ui/field/field';
import { Input } from '#shared/components/ui/input/input';
import { Badge } from '#shared/components/ui/badge/badge';
import { BuyersService, type Buyer } from '#core/services/buyers/buyers-service';
import {
  BarcodeScannerService,
  QR_FORMATS,
} from '#core/services/barcode/barcode-scanner-service';
import { messageOf } from '#shared/utils/api-error';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Désigner l'acheteur d'une commande — par son QR ou par son nom.
 *
 * ⚠️ La recherche par nom n'est pas un second choix : `BarcodeDetector` n'existe
 * ni sous Firefox ni sous Safari, la caméra exige HTTPS, et un téléphone se
 * décharge. Elle est donc toujours atteignable, sans passer par le scanner.
 *
 * Fermer sans choisir laisse la commande anonyme, qui est le cas courant.
 */
@Component({
  selector: 'bfd-buyer-picker-modal',
  imports: [Btn, Field, Input, Badge, ModalShell],
  templateUrl: './buyer-picker-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuyerPickerModal implements OnDestroy {
  readonly id = input.required<string>();
  readonly onPick = input<(buyer: Buyer) => void>(() => {});

  private readonly modalService = inject(ModalService);
  private readonly buyers = inject(BuyersService);
  private readonly scanner = inject(BarcodeScannerService);

  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

  protected readonly query = signal('');
  protected readonly results = signal<Buyer[]>([]);
  protected readonly searching = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly scanning = signal(false);
  protected readonly scanSupported = this.scanner.isSupported();

  protected readonly icSearch = LucideUserSearch;

  ngOnDestroy(): void {
    this.scanner.stop();
  }

  protected onQuery(value: string): void {
    this.query.set(value);
    if (value.trim().length >= 2) void this.search();
    else this.results.set([]);
  }

  protected async search(): Promise<void> {
    const term = this.query().trim();
    if (term.length < 2) return;

    this.searching.set(true);
    this.error.set(null);
    try {
      this.results.set(await lastValueFrom(this.buyers.search(term)));
    } catch (error: unknown) {
      this.error.set(messageOf(error, 'La recherche a échoué.'));
    } finally {
      this.searching.set(false);
    }
  }

  protected async startScan(): Promise<void> {
    const element = this.video()?.nativeElement;
    if (!element) return;

    this.scanning.set(true);
    this.error.set(null);

    const started = await this.scanner.start(
      element,
      (code) => void this.onScanned(code),
      QR_FORMATS,
    );

    if (!started) {
      this.scanning.set(false);
      this.error.set('La caméra n’est pas disponible — utilisez la recherche par nom.');
    }
  }

  protected stopScan(): void {
    this.scanner.stop();
    this.scanning.set(false);
  }

  private async onScanned(token: string): Promise<void> {
    try {
      this.pick(await lastValueFrom(this.buyers.verifyQr(token)));
    } catch (error: unknown) {
      this.error.set(messageOf(error, 'Ce QR n’a pas pu être lu.'));
    }
  }

  protected pick(buyer: Buyer): void {
    this.scanner.stop();
    this.onPick()(buyer);
    this.modalService.close(this.id());
  }

  protected cancel(): void {
    this.scanner.stop();
    this.modalService.close(this.id());
  }

  protected fastPassLabel(buyer: Buyer): string | null {
    if (!buyer.fastPass) return null;
    const until = new Date(buyer.fastPass.validUntil).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${buyer.fastPass.label} · jusqu'au ${until}`;
  }
}

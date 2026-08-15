import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { LucideCamera, LucideSearch, LucideX } from '@lucide/angular';
import { lastValueFrom } from 'rxjs';
import { Btn } from '#shared/components/ui/btn/btn';
import { Input } from '#shared/components/ui/input/input';
import { Badge } from '#shared/components/ui/badge/badge';
import { BuyersService, type Buyer } from '#core/services/buyers/buyers-service';
import { BarcodeScannerService, QR_FORMATS } from '#core/services/barcode/barcode-scanner-service';
import { messageOf } from '#shared/utils/api-error';

/**
 * Identification d'un acheteur, **en ligne dans le panier** plutôt qu'en modale :
 * c'est un geste de comptoir, fait d'une main entre deux articles, qui ne mérite
 * pas de couvrir l'écran.
 *
 * ⚠️ Un **seul** élément `<video>`, toujours monté et simplement masqué. Deux
 * éléments dans deux branches `@if` faisaient pointer `viewChild` sur celui qui
 * n'était pas rendu : la caméra démarrait dans le vide et l'aperçu restait noir.
 */
@Component({
  selector: 'bfd-buyer-picker',
  imports: [Btn, Input, Badge],
  templateUrl: './buyer-picker.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuyerPicker implements OnDestroy {
  readonly picked = output<Buyer>();
  readonly dismissed = output<void>();

  private readonly buyers = inject(BuyersService);
  private readonly scanner = inject(BarcodeScannerService);

  private readonly videoRef = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  protected readonly query = signal('');
  protected readonly results = signal<Buyer[]>([]);
  protected readonly searching = signal(false);
  protected readonly error = signal<string | null>(null);

  /** `idle` → `starting` → `scanning`. L'état intermédiaire évite l'écran noir muet. */
  protected readonly camera = signal<'idle' | 'starting' | 'scanning'>('idle');
  protected readonly scanSupported = this.scanner.isSupported();

  protected readonly icSearch = LucideSearch;
  protected readonly icCamera = LucideCamera;
  protected readonly icClose = LucideX;

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

  protected async toggleCamera(): Promise<void> {
    if (this.camera() !== 'idle') {
      this.stopCamera();
      return;
    }

    this.camera.set('starting');
    this.error.set(null);

    const started = await this.scanner.start(
      this.videoRef().nativeElement,
      (code) => void this.onScanned(code),
      QR_FORMATS,
    );

    if (started) {
      this.camera.set('scanning');
    } else {
      this.camera.set('idle');
      this.error.set('Caméra indisponible — utilisez la recherche par nom.');
    }
  }

  protected stopCamera(): void {
    this.scanner.stop();
    this.camera.set('idle');
  }

  private async onScanned(token: string): Promise<void> {
    try {
      this.choose(await lastValueFrom(this.buyers.verifyQr(token)));
    } catch (error: unknown) {
      this.error.set(messageOf(error, 'Ce QR n’a pas pu être lu.'));
    }
  }

  protected choose(buyer: Buyer): void {
    this.stopCamera();
    this.picked.emit(buyer);
  }

  protected close(): void {
    this.stopCamera();
    this.dismissed.emit();
  }

  protected fastPassLabel(buyer: Buyer): string | null {
    if (!buyer.fastPass) return null;
    const until = new Date(buyer.fastPass.validUntil).toLocaleDateString('fr-FR');
    return `valide jusqu'au ${until}`;
  }
}

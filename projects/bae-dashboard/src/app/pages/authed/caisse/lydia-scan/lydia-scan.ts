import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { LucideX } from '@lucide/angular';
import { Btn } from '@bae/ui';
import { BarcodeScannerService, QR_FORMATS } from '#core/services/barcode/barcode-scanner-service';

/**
 * Le scan du QR Lydia, **dans la page et non dans une modale** : le conteneur
 * des modales porte un `transform`, qui piège tout `position: fixed` d'un
 * descendant — un plein écran y est impossible.
 *
 * ⚠️ Un **seul** élément `<video>`, toujours monté et simplement masqué, pour
 * la même raison que `buyer-picker` : deux éléments dans deux branches `@if`
 * font pointer `viewChild` sur celui qui n'est pas rendu.
 */
@Component({
  selector: 'bfd-lydia-scan',
  imports: [Btn],
  templateUrl: './lydia-scan.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LydiaScan implements AfterViewInit, OnDestroy {
  /** Vrai pendant l'aller-retour avec l'API : le scan est fait, on attend Lydia. */
  readonly submitting = input<boolean>(false);

  readonly scanned = output<string>();
  readonly dismissed = output<void>();

  private readonly scanner = inject(BarcodeScannerService);
  private readonly videoRef = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  protected readonly camera = signal<'starting' | 'scanning' | 'idle'>('idle');
  protected readonly error = signal<string | null>(null);

  protected readonly icClose = LucideX;

  /** Le `<video>` n'existe qu'une fois la vue initialisée : démarrer plus tôt
   *  fait échouer `viewChild.required` (NG0951). */
  ngAfterViewInit(): void {
    void this.start();
  }

  ngOnDestroy(): void {
    this.scanner.stop();
  }

  private async start(): Promise<void> {
    this.error.set(null);
    this.camera.set('starting');

    const started = await this.scanner.start(
      this.videoRef().nativeElement,
      (code) => this.onCode(code),
      QR_FORMATS,
    );

    if (started) {
      this.camera.set('scanning');
    } else {
      this.camera.set('idle');
      this.error.set('Caméra indisponible — choisissez un autre moyen de paiement.');
    }
  }

  private onCode(code: string): void {
    if (this.submitting()) return;
    this.scanner.stop();
    this.camera.set('idle');
    this.scanned.emit(code);
  }

  protected close(): void {
    this.scanner.stop();
    this.dismissed.emit();
  }
}

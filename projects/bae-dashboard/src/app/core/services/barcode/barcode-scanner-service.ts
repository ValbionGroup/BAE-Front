import { Injectable } from '@angular/core';

/** `BarcodeDetector` n'est pas dans les types du DOM : l'API n'est pas standardisée. */
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}

/** Codes-barres produits — le cas des Stocks. */
export const BARCODE_FORMATS = ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e'];

/** QR d'identité — le cas du comptoir. */
export const QR_FORMATS = ['qr_code'];

/**
 * Fenêtre pendant laquelle un même code relu ne compte pas.
 *
 * Le décodage tourne à la fréquence d'affichage : un paquet tenu deux secondes
 * devant l'objectif est lu cent fois, et sans ce délai il entrerait cent unités
 * en stock.
 */
export const SCAN_COOLDOWN_MS = 1500;

export type ScannerUnavailability = 'insecure-context' | 'browser';

/**
 * Caméra et décodage, isolés de la page.
 *
 * `getUserMedia` et `BarcodeDetector` n'existent ni sous jsdom ni sur Firefox
 * et Safari desktop : la page doit fonctionner sans eux, la saisie manuelle
 * servant de repli.
 */
@Injectable({ providedIn: 'root' })
export class BarcodeScannerService {
  private stream: MediaStream | null = null;
  private detector: BarcodeDetectorLike | null = null;
  private stopped = false;
  private readonly lastEmitted = new Map<string, number>();

  /**
   * ⚠️ `insecure-context` se corrige côté serveur, `browser` non — les fusionner
   * fait lire « changez de navigateur » à quelqu'un dont le seul tort est
   * d'ouvrir la page sur `http://192.168.x.x`. La caméra n'est exposée qu'aux
   * origines dignes de confiance : HTTPS, plus une exception pour `localhost`
   * et `127.0.0.1`. Une IP privée n'en bénéficie pas.
   */
  unavailability(): ScannerUnavailability | null {
    if (typeof globalThis === 'undefined' || typeof navigator === 'undefined') return 'browser';
    if (globalThis.isSecureContext === false) return 'insecure-context';
    if (!('BarcodeDetector' in globalThis)) return 'browser';
    if (navigator.mediaDevices?.getUserMedia === undefined) return 'browser';
    return null;
  }

  isSupported(): boolean {
    return this.unavailability() === null;
  }

  /**
   * Décide si un code lu compte comme une nouvelle lecture. Le délai est **par
   * code** : viser deux produits différents à la suite les enregistre tous les
   * deux, seule la répétition du même code est absorbée.
   */
  accepts(code: string, now: number = Date.now()): boolean {
    const previous = this.lastEmitted.get(code);
    if (previous !== undefined && now - previous < SCAN_COOLDOWN_MS) return false;
    this.lastEmitted.set(code, now);
    return true;
  }

  /** Rend `false` si le navigateur ou l'utilisateur refuse la caméra. */
  async start(
    video: HTMLVideoElement,
    onCode: (code: string) => void,
    formats: string[] = BARCODE_FORMATS,
  ): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
    } catch {
      return false;
    }

    const Ctor = (globalThis as unknown as { BarcodeDetector: BarcodeDetectorCtor })
      .BarcodeDetector;
    this.detector = new Ctor({ formats });
    this.stopped = false;

    video.srcObject = this.stream;
    await video.play().catch(() => undefined);

    const tick = async (): Promise<void> => {
      if (this.stopped || !this.detector) return;
      try {
        const found = await this.detector.detect(video);
        if (found.length > 0 && this.accepts(found[0].rawValue)) onCode(found[0].rawValue);
      } catch {
        // Une image illisible n'a rien d'exceptionnel — on retente.
      }
      if (!this.stopped) requestAnimationFrame(() => void tick());
    };
    void tick();

    return true;
  }

  stop(): void {
    this.stopped = true;
    this.detector = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    // Le service est `providedIn: 'root'` : sans cet oubli, revenir sur l'écran
    // ferait ignorer le premier scan.
    this.lastEmitted.clear();
  }
}

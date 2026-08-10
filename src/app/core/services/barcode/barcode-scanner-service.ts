import { Injectable } from '@angular/core';

/**
 * Minimal shape of the browser's native `BarcodeDetector`.
 *
 * Il n'est pas dans les types du DOM (l'API n'est pas encore standardisée), et
 * on n'en utilise que deux membres : le déclarer ici évite un `any` et évite
 * surtout d'ajouter une dépendance de types pour deux signatures.
 */
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?(): Promise<string[]>;
}

/** Les formats que portent les emballages alimentaires. */
const FORMATS = ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e'];

/**
 * Caméra + décodage de code-barres, isolés de la page.
 *
 * Isolés pour deux raisons. D'abord `getUserMedia` et `BarcodeDetector`
 * n'existent pas sous jsdom : les mêler à la page rendrait sa logique de
 * session intestable. Ensuite `BarcodeDetector` n'est natif que sur Chrome et
 * Edge — Firefox et Safari desktop ne l'ont pas. Toute la page doit donc
 * fonctionner sans lui, la saisie manuelle étant le chemin de repli, et c'est
 * `isSupported()` qui le dit.
 */
@Injectable({ providedIn: 'root' })
export class BarcodeScannerService {
  private stream: MediaStream | null = null;
  private detector: BarcodeDetectorLike | null = null;
  private stopped = false;

  /** Vrai si ce navigateur sait décoder sans bibliothèque tierce. */
  isSupported(): boolean {
    return (
      typeof globalThis !== 'undefined' &&
      'BarcodeDetector' in globalThis &&
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia !== undefined
    );
  }

  /**
   * Ouvre la caméra arrière si elle existe et pousse chaque code lu dans
   * `onCode`. Rend `false` si le navigateur ou l'utilisateur refuse — la page
   * bascule alors sur la saisie manuelle plutôt que d'afficher un écran mort.
   */
  async start(video: HTMLVideoElement, onCode: (code: string) => void): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
    } catch {
      // Permission refusée, ou aucune caméra. Ce n'est pas une panne : c'est le
      // cas où la saisie manuelle prend le relais.
      return false;
    }

    const Ctor = (globalThis as unknown as { BarcodeDetector: BarcodeDetectorCtor })
      .BarcodeDetector;
    this.detector = new Ctor({ formats: FORMATS });
    this.stopped = false;

    video.srcObject = this.stream;
    await video.play().catch(() => undefined);

    const tick = async (): Promise<void> => {
      if (this.stopped || !this.detector) return;
      try {
        const found = await this.detector.detect(video);
        // Un seul code par image : viser deux emballages à la fois n'a pas de
        // sens ici, et prendre le premier évite d'empiler deux lignes d'un coup.
        if (found.length > 0) onCode(found[0].rawValue);
      } catch {
        // Une image illisible n'a rien d'exceptionnel — on retente.
      }
      if (!this.stopped) requestAnimationFrame(() => void tick());
    };
    void tick();

    return true;
  }

  /** Coupe la caméra. À appeler en quittant l'écran, sinon la LED reste allumée. */
  stop(): void {
    this.stopped = true;
    this.detector = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}

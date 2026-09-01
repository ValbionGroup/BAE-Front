import { Injectable } from '@angular/core';

/** `BarcodeDetector` n'est pas dans les types du DOM : l'API n'est pas standardisée. */
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}

/** Le repli WASM, jamais importé statiquement — cf. `loadFallback()`. */
type Ponyfill = typeof import('barcode-detector/ponyfill');

/**
 * Où le repli va chercher son binaire.
 *
 * ⚠️ `zxing-wasm` le télécharge depuis le CDN jsDelivr par défaut : un comptoir
 * sur le réseau d'une salle des fêtes perdrait son scanner, et le point de
 * vente dépendrait d'un tiers à l'exécution. Le fichier est copié dans la
 * sortie de build par l'entrée `assets` d'`angular.json` ; `document.baseURI`
 * garde l'URL juste sous un déploiement en sous-chemin.
 */
function wasmUrl(path: string, prefix: string): string {
  if (!path.endsWith('.wasm')) return prefix + path;
  return new URL('zxing/zxing_reader.wasm', document.baseURI).href;
}

/** Codes-barres produits — le cas des Stocks. */
export const BARCODE_FORMATS = ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e'];

/** QR d'identité — le cas du comptoir. */
export const QR_FORMATS = ['qr_code'];

/**
 * ⚠️ Sans contrainte de résolution, Chrome capture dans son format par défaut —
 * 640×480 — quel que soit le capteur : l'aperçu plein écran d'un téléphone récent
 * n'est alors qu'un agrandissement de 640 px, et les barres fines d'un EAN-13
 * tombent sous le seuil de lisibilité. `ideal` et non `min` : une webcam incapable
 * de 1080p doit dégrader, pas faire échouer `getUserMedia`.
 */
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: 'environment',
  width: { ideal: 1920 },
  height: { ideal: 1080 },
};

/**
 * Délai entre deux lectures — ~12 par seconde.
 *
 * Décoder chaque image affichée sature le thread principal en 1080p, surtout sur
 * le repli WASM où un `detect()` coûte des dizaines de millisecondes. 12 Hz reste
 * très au-dessus du geste humain.
 */
const SCAN_INTERVAL_MS = 80;

/**
 * Fenêtre pendant laquelle un même code relu ne compte pas.
 *
 * Le décodage est continu : un paquet tenu deux secondes devant l'objectif est lu
 * une vingtaine de fois, et sans ce délai il entrerait vingt unités en stock.
 */
export const SCAN_COOLDOWN_MS = 1500;

export type ScannerUnavailability = 'insecure-context' | 'browser';

/**
 * Caméra et décodage, isolés de la page.
 *
 * `BarcodeDetector` est une API Chromium que WebKit et Gecko n'ont jamais
 * implémentée. Sur iOS, où l'App Store impose WebKit à **tous** les navigateurs
 * — Chrome iOS est une coque autour de Safari —, aucun décodeur natif n'existe.
 * Le repli WASM lui rend le scan ; la saisie manuelle ne sert plus qu'aux
 * navigateurs sans caméra du tout.
 */
@Injectable({ providedIn: 'root' })
export class BarcodeScannerService {
  private stream: MediaStream | null = null;
  private detector: BarcodeDetectorLike | null = null;
  private stopped = false;
  private readonly lastEmitted = new Map<string, number>();
  private fallback: Promise<Ponyfill> | null = null;

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
      this.stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS });
    } catch {
      return false;
    }

    try {
      this.detector = await this.decoder(formats);
    } catch {
      this.stop();
      return false;
    }
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
      if (!this.stopped) setTimeout(() => void tick(), SCAN_INTERVAL_MS);
    };
    void tick();

    return true;
  }

  /**
   * Le décodeur natif s'il existe, le repli WASM sinon.
   *
   * L'import est dynamique pour que le binaire parte dans son propre morceau :
   * un navigateur qui sait décoder ne doit pas payer les centaines de
   * kilo-octets d'un décodeur qu'il n'utilisera pas.
   */
  private async decoder(formats: string[]): Promise<BarcodeDetectorLike> {
    const native = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
      .BarcodeDetector;
    if (native) return new native({ formats });

    const { BarcodeDetector } = await this.loadFallback();
    return new (BarcodeDetector as unknown as BarcodeDetectorCtor)({ formats });
  }

  /**
   * Le binaire est chargé **ici**, pas à la première image.
   *
   * Laissé paresseux, un WASM injoignable ne se voyait qu'au premier `detect()`
   * — et la boucle de lecture, qui avale les images illisibles, se reprogrammait
   * indéfiniment en relevant l'erreur à chaque tour. Échouer à l'ouverture rend
   * `false` à `start()`, ce que l'écran sait déjà traduire en saisie manuelle.
   */
  private loadFallback(): Promise<Ponyfill> {
    this.fallback ??= import('barcode-detector/ponyfill')
      .then(async (ponyfill) => {
        await ponyfill.prepareZXingModule({
          overrides: { locateFile: wasmUrl },
          fireImmediately: true,
        });
        return ponyfill;
      })
      .catch((error: unknown) => {
        // Oublié pour qu'une coupure passagère ne condamne pas le scanner
        // jusqu'au rechargement de la page.
        this.fallback = null;
        throw error;
      });
    return this.fallback;
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

import { TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';

import { BarcodeScannerService, QR_FORMATS, SCAN_COOLDOWN_MS } from './barcode-scanner-service';

const prepareZXingModule = vi.fn();
const ponyfillConstructed = vi.fn();

vi.mock('barcode-detector/ponyfill', () => ({
  prepareZXingModule,
  BarcodeDetector: class {
    constructor(options?: { formats?: string[] }) {
      ponyfillConstructed(options);
    }
    detect() {
      return Promise.resolve([]);
    }
  },
}));

describe(BarcodeScannerService.name, () => {
  let service: BarcodeScannerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BarcodeScannerService);
  });

  it('accepts a code the first time it is read', () => {
    expect(service.accepts('3268754117904', 1000)).toBe(true);
  });

  it('absorbs the same code re-read within the cooldown', () => {
    service.accepts('3268754117904', 1000);

    // Le décodage tourne à la fréquence d'affichage : un paquet tenu devant
    // l'objectif est relu des dizaines de fois, et chaque relecture ajouterait
    // une unité en stock.
    expect(service.accepts('3268754117904', 1016)).toBe(false);
    expect(service.accepts('3268754117904', 1000 + SCAN_COOLDOWN_MS - 1)).toBe(false);
  });

  it('accepts the same code again once the cooldown has passed', () => {
    service.accepts('3268754117904', 1000);

    // Scanner deux fois le même produit est un geste légitime — c'est ainsi
    // qu'on compte six briques de lait identiques.
    expect(service.accepts('3268754117904', 1000 + SCAN_COOLDOWN_MS)).toBe(true);
  });

  it('does not make one code wait for another', () => {
    service.accepts('3268754117904', 1000);

    // Le délai est par code : viser deux produits différents à la suite doit
    // les enregistrer tous les deux, sans attendre.
    expect(service.accepts('3168421988011', 1010)).toBe(true);
  });

  it('forgets previous reads when the camera stops', () => {
    service.accepts('3268754117904', 1000);
    service.stop();

    // Revenir sur l'écran ne doit pas faire ignorer le premier scan : le
    // service est `providedIn: 'root'`, il survit à la page.
    expect(service.accepts('3268754117904', 1010)).toBe(true);
  });

  describe('décodeur', () => {
    const nativeConstructed = vi.fn();

    class NativeDetector {
      constructor(options?: { formats?: string[] }) {
        nativeConstructed(options);
      }
      detect() {
        return Promise.resolve([]);
      }
    }

    /** Rien de tout cela n'existe sous jsdom : la caméra est posée à la main. */
    function stubCamera(): HTMLVideoElement {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: () => Promise.resolve({ getTracks: () => [] }) },
        configurable: true,
      });
      return { srcObject: null, play: () => Promise.resolve() } as unknown as HTMLVideoElement;
    }

    afterEach(() => {
      service.stop();
      Reflect.deleteProperty(globalThis, 'BarcodeDetector');
      Reflect.deleteProperty(navigator, 'mediaDevices');
      vi.clearAllMocks();
    });

    /**
     * Le cas iOS : tout navigateur y est Safari, et WebKit n'a jamais
     * implémenté `BarcodeDetector`. L'absence du décodeur natif ne doit plus
     * masquer le bouton de scan — c'est le repli WASM qui prend la main.
     */
    it('reste disponible sans `BarcodeDetector` natif', () => {
      stubCamera();

      expect(service.unavailability()).toBeNull();
      expect(service.isSupported()).toBe(true);
    });

    it('reste indisponible sans caméra du tout', () => {
      expect(service.unavailability()).toBe('browser');
    });

    it('reste indisponible hors contexte sécurisé', () => {
      stubCamera();
      Object.defineProperty(globalThis, 'isSecureContext', {
        value: false,
        configurable: true,
      });

      // Une IP privée en HTTP n'a pas de caméra : cela se corrige côté serveur,
      // pas en changeant de navigateur.
      expect(service.unavailability()).toBe('insecure-context');

      Object.defineProperty(globalThis, 'isSecureContext', { value: true, configurable: true });
    });

    it('n’embarque pas le décodeur WASM quand le natif est là', async () => {
      const video = stubCamera();
      Object.defineProperty(globalThis, 'BarcodeDetector', {
        value: NativeDetector,
        configurable: true,
      });

      expect(await service.start(video, () => undefined, QR_FORMATS)).toBe(true);

      expect(nativeConstructed).toHaveBeenCalledWith({ formats: QR_FORMATS });
      // Le WASM pèse des centaines de kilo-octets : Chrome ne doit jamais le charger.
      expect(ponyfillConstructed).not.toHaveBeenCalled();
      expect(prepareZXingModule).not.toHaveBeenCalled();
    });

    it('se replie sur le décodeur WASM quand le natif manque', async () => {
      const video = stubCamera();

      expect(await service.start(video, () => undefined, QR_FORMATS)).toBe(true);

      expect(ponyfillConstructed).toHaveBeenCalledWith({ formats: QR_FORMATS });
      expect(nativeConstructed).not.toHaveBeenCalled();
    });

    /**
     * Par défaut `zxing-wasm` va chercher son binaire sur le CDN jsDelivr : un
     * comptoir sur le réseau d'une salle des fêtes perdrait son scanner.
     */
    it('sert le binaire WASM depuis l’application, pas depuis un CDN', async () => {
      const video = stubCamera();

      await service.start(video, () => undefined, QR_FORMATS);

      const locateFile = prepareZXingModule.mock.calls[0][0].overrides.locateFile;
      expect(locateFile('zxing_reader.wasm', 'https://cdn.example/')).toBe(
        new URL('zxing/zxing_reader.wasm', document.baseURI).href,
      );
    });
  });
});

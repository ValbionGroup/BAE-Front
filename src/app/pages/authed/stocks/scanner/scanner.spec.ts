import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { vi } from 'vitest';

import { StocksScanner } from './scanner';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import { ModalService } from '#shared/components/modal/modal.service';

const baseUrl = 'http://api.test/v1';

/** La logique de session est testée par la saisie manuelle : c'est le même
 *  chemin que la caméra, qui n'existe pas sous jsdom. */
interface ScannerInternals {
  onBarcode(code: string): Promise<void>;
  lines(): readonly { barcode: string; goodId: number | null; quantity: number }[];
  ready(): readonly unknown[];
  bump(barcode: string, delta: number): void;
  validate(): Promise<void>;
  saveError(): string | null;
}

describe(StocksScanner.name, () => {
  let fixture: ComponentFixture<StocksScanner>;
  let scanner: ScannerInternals;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StocksScanner],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StocksScanner);
    scanner = fixture.componentInstance as unknown as ScannerInternals;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();

    // La page charge le store pour alimenter la modale de création.
    http.match((r) => r.url.endsWith('/stocks')).forEach((r) => r.flush([]));
    http.match((r) => r.url.endsWith('/categories')).forEach((r) => r.flush([]));
  });

  afterEach(() => {
    http.verify();
    // Sans cela, un test qui échoue en cours de route laisse le TestBed
    // instancié et le `beforeEach` suivant part en « already instantiated ».
    TestBed.resetTestingModule();
  });

  /** Laisse les `await` enchaînés de la page émettre leurs requêtes. */
  function tick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  function flushLookup(barcode: string, good: unknown | null): void {
    const req = http.expectOne((r) => r.url.endsWith('/goods') && r.params.get('barcode') !== null);
    expect(req.request.params.get('barcode')).toBe(barcode);
    req.flush(good ? [good] : []);
  }

  it('resolves a scanned barcode into a known product', async () => {
    const scanned = scanner.onBarcode('3268754117904');
    flushLookup('3268754117904', {
      id: 7,
      name: 'Moutarde',
      unit: 'pcs',
      brand: '',
      categoryId: 2,
    });
    await scanned;

    expect(scanner.lines()).toHaveLength(1);
    expect(scanner.lines()[0]).toMatchObject({ goodId: 7, quantity: 1 });
  });

  it('marks an unmatched barcode as a product to create', async () => {
    const scanned = scanner.onBarcode('0000000000000');
    flushLookup('0000000000000', null);
    await scanned;

    // Une liste vide est une réponse normale, pas une erreur : c'est elle qui
    // ouvre la création.
    expect(scanner.lines()[0].goodId).toBeNull();
    // Et un produit inconnu n'a rien à entrer en stock.
    expect(scanner.ready()).toHaveLength(0);
  });

  it('bumps the quantity instead of stacking a second line for the same code', async () => {
    const first = scanner.onBarcode('3268754117904');
    flushLookup('3268754117904', {
      id: 7,
      name: 'Moutarde',
      unit: 'pcs',
      brand: '',
      categoryId: 2,
    });
    await first;

    // La caméra relit la même étiquette plusieurs fois par seconde : sans ce
    // regroupement, un seul paquet remplirait l'écran.
    await scanner.onBarcode('3268754117904');

    expect(scanner.lines()).toHaveLength(1);
    expect(scanner.lines()[0].quantity).toBe(2);
    http.expectNone((r) => r.url.endsWith('/goods') && r.params.get('barcode') !== null);
  });

  it('ignores the spaces a printed code carries', async () => {
    const scanned = scanner.onBarcode('3 268 754 117 904');
    flushLookup('3268754117904', {
      id: 7,
      name: 'Moutarde',
      unit: 'pcs',
      brand: '',
      categoryId: 2,
    });
    await scanned;

    expect(scanner.lines()[0].barcode).toBe('3268754117904');
  });

  it('creates one stock batch per ready line and clears them', async () => {
    const scanned = scanner.onBarcode('3268754117904');
    flushLookup('3268754117904', {
      id: 7,
      name: 'Moutarde',
      unit: 'pcs',
      brand: '',
      categoryId: 2,
    });
    await scanned;
    scanner.bump('3268754117904', 2);

    const validated = scanner.validate();
    const req = http.expectOne(`${baseUrl}/stock-batches`);
    expect(req.request.body).toEqual({ goodId: 7, quantity: 3, expirationDate: null });
    req.flush({ id: 1 });
    // `refresh()` n'est appelé qu'après la résolution du POST : sans ce tick,
    // ses requêtes n'existent pas encore et resteraient ouvertes au `verify()`.
    await tick();
    // La validation recharge le tableau des stocks derrière.
    http.match((r) => r.url.endsWith('/stocks')).forEach((r) => r.flush([]));
    http.match((r) => r.url.endsWith('/categories')).forEach((r) => r.flush([]));
    await validated;

    // La ligne enregistrée disparaît : revalider ne doit pas la créer deux fois.
    expect(scanner.lines()).toHaveLength(0);
  });

  it('attaches a freshly created product to the line that asked for it', async () => {
    const opened = vi.spyOn(TestBed.inject(ModalService), 'open');
    const scanned = scanner.onBarcode('0000000000000');
    flushLookup('0000000000000', null);
    await scanned;
    expect(scanner.lines()[0].goodId).toBeNull();

    (scanner as unknown as { createUnknown(b: string): void }).createUnknown('0000000000000');
    const config = opened.mock.calls.at(0)?.at(0) as unknown as {
      inputs: { created: (p: unknown) => void };
    };
    config.inputs.created({ id: 42, name: 'Cornichons' });

    // Sans ce rattachement la ligne resterait « à créer » et ne partirait
    // jamais en stock, alors que le produit existe désormais.
    expect(scanner.lines()[0]).toMatchObject({ goodId: 42, name: 'Cornichons' });
    expect(scanner.ready()).toHaveLength(1);
  });

  it('keeps a refused line in the session and says so', async () => {
    const scanned = scanner.onBarcode('3268754117904');
    flushLookup('3268754117904', {
      id: 7,
      name: 'Moutarde',
      unit: 'pcs',
      brand: '',
      categoryId: 2,
    });
    await scanned;

    const validated = scanner.validate();
    http
      .expectOne(`${baseUrl}/stock-batches`)
      .flush({ message: 'Quantité invalide.' }, { status: 422, statusText: 'x' });
    await validated;

    expect(scanner.saveError()).toBe('Quantité invalide.');
    // Elle reste à l'écran : la perdre effacerait un scan sans rien enregistrer.
    expect(scanner.lines()).toHaveLength(1);
  });
});

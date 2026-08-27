import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { vi } from 'vitest';

import { StocksScanner } from './scanner';
import { API_BASE_URL, ToastService } from '@bae/ui';
import { ModalService } from '#shared/components/modal/modal.service';

const baseUrl = 'http://api.test/v1';

/** La logique de session est testée par la saisie manuelle : c'est le même
 *  chemin que la caméra, qui n'existe pas sous jsdom. */
interface ScannerInternals {
  onBarcode(code: string): Promise<void>;
  lines(): readonly {
    id: string;
    barcode: string | null;
    goodId: number | null;
    name: string;
    quantity: number;
    attachPending: boolean;
  }[];
  resolveUnknown(lineId: string): void;
  addWithoutBarcode(product: { id: number; name: string }): void;
  ready(): readonly unknown[];
  bump(lineId: string, delta: number): void;
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
    scanner.bump(scanner.lines()[0].id, 2);

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

  it('confirms the save with a toast', async () => {
    const shown = vi.spyOn(TestBed.inject(ToastService), 'show');
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
    http.expectOne(`${baseUrl}/stock-batches`).flush({ id: 1 });
    await tick();
    http.match((r) => r.url.endsWith('/stocks')).forEach((r) => r.flush([]));
    http.match((r) => r.url.endsWith('/categories')).forEach((r) => r.flush([]));
    await validated;

    expect(shown).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: '1 lot enregistré' }),
    );
  });

  it('says so in a toast when a batch is refused', async () => {
    const shown = vi.spyOn(TestBed.inject(ToastService), 'show');
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

    expect(shown).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', message: 'Quantité invalide.' }),
    );
  });

  it('attaches a freshly created product to the line that asked for it', async () => {
    const opened = vi.spyOn(TestBed.inject(ModalService), 'open');
    const scanned = scanner.onBarcode('0000000000000');
    flushLookup('0000000000000', null);
    await scanned;
    expect(scanner.lines()[0].goodId).toBeNull();

    (scanner as unknown as { createUnknown(id: string): void }).createUnknown(
      scanner.lines()[0].id,
    );
    const config = opened.mock.calls.at(0)?.at(0) as unknown as {
      inputs: { created: (p: unknown) => void };
    };
    config.inputs.created({ id: 42, name: 'Cornichons' });

    // Sans ce rattachement la ligne resterait « à créer » et ne partirait
    // jamais en stock, alors que le produit existe désormais.
    expect(scanner.lines()[0]).toMatchObject({ goodId: 42, name: 'Cornichons' });
    expect(scanner.ready()).toHaveLength(1);
    // `POST /goods` a déjà posé le code : le reposter à la validation le ferait
    // refuser par sa propre contrainte d'unicité.
    expect(scanner.lines()[0].attachPending).toBe(false);
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

  /** Amène une ligne inconnue jusqu'au rattachement décidé, non écrit. */
  async function pendingAttach(barcode = '0000000000000', goodId = 42): Promise<void> {
    const opened = vi.spyOn(TestBed.inject(ModalService), 'open');
    const scanned = scanner.onBarcode(barcode);
    flushLookup(barcode, null);
    await scanned;

    scanner.resolveUnknown(scanner.lines()[0].id);
    const config = opened.mock.calls.at(-1)?.at(0) as unknown as {
      inputs: { picked: (p: unknown) => void };
    };
    config.inputs.picked({ id: goodId, name: 'Nutella' });
    opened.mockRestore();
  }

  it('attaches an unknown code to an existing good without writing anything yet', async () => {
    await pendingAttach();

    expect(scanner.lines()[0]).toMatchObject({ goodId: 42, name: 'Nutella', attachPending: true });
    expect(scanner.ready()).toHaveLength(1);
    // Rien ne part avant la validation : quitter le scanner ne doit laisser
    // aucune trace en base.
    http.expectNone((r) => r.url.includes('/barcodes'));
  });

  it('writes the barcode before the batch it belongs to', async () => {
    await pendingAttach();

    const validated = scanner.validate();

    const attach = http.expectOne(`${baseUrl}/goods/42/barcodes`);
    expect(attach.request.body).toEqual({ code: '0000000000000' });
    // L'ordre est la garantie : un lot entré avant que le code soit accepté
    // porterait sur un aliment que le serveur peut encore refuser.
    http.expectNone(`${baseUrl}/stock-batches`);
    attach.flush({ goodId: 42, code: '0000000000000' });
    await tick();

    http.expectOne(`${baseUrl}/stock-batches`).flush({ id: 1 });
    await tick();
    http.match((r) => r.url.endsWith('/stocks')).forEach((r) => r.flush([]));
    http.match((r) => r.url.endsWith('/categories')).forEach((r) => r.flush([]));
    await validated;

    expect(scanner.lines()).toHaveLength(0);
  });

  it('enters no batch when the barcode is refused', async () => {
    await pendingAttach();

    const validated = scanner.validate();
    http
      .expectOne(`${baseUrl}/goods/42/barcodes`)
      .flush(
        { message: 'Ce code-barres est déjà associé à un autre produit.' },
        { status: 409, statusText: 'Conflict' },
      );
    await tick();

    // Le lot ne part pas sur une denrée contestée.
    http.expectNone(`${baseUrl}/stock-batches`);
    await validated;

    expect(scanner.saveError()).toBe('Ce code-barres est déjà associé à un autre produit.');
    expect(scanner.lines()).toHaveLength(1);
  });

  it('does not repost a barcode already written when the batch failed', async () => {
    await pendingAttach();

    const first = scanner.validate();
    http.expectOne(`${baseUrl}/goods/42/barcodes`).flush({ goodId: 42, code: '0000000000000' });
    await tick();
    http
      .expectOne(`${baseUrl}/stock-batches`)
      .flush({ message: 'Quantité invalide.' }, { status: 422, statusText: 'x' });
    await first;

    // Le rattachement est acquis : le reposter le ferait refuser par la
    // contrainte d'unicité, et la reprise resterait bloquée pour toujours.
    expect(scanner.lines()[0].attachPending).toBe(false);

    const second = scanner.validate();
    http.expectNone((r) => r.url.includes('/barcodes'));
    http.expectOne(`${baseUrl}/stock-batches`).flush({ id: 1 });
    await tick();
    http.match((r) => r.url.endsWith('/stocks')).forEach((r) => r.flush([]));
    http.match((r) => r.url.endsWith('/categories')).forEach((r) => r.flush([]));
    await second;

    expect(scanner.lines()).toHaveLength(0);
  });

  /**
   * L'entrée sans code-barres, dans la même session que les lignes scannées :
   * une caisse de vrac et un pack de bouteilles arrivent par le même camion, et
   * séparer les deux gestes obligerait à valider deux fois.
   */
  it('adds a line for a good picked by hand, with no barcode', () => {
    scanner.addWithoutBarcode({ id: 7, name: 'Farine T55' });

    expect(scanner.lines()).toHaveLength(1);
    expect(scanner.lines()[0]).toMatchObject({
      barcode: null,
      goodId: 7,
      name: 'Farine T55',
      quantity: 1,
      // La denrée existe déjà : il n'y a aucun code à rattacher, et un
      // rattachement en attente ferait poster `null` à la validation.
      attachPending: false,
    });
    expect(scanner.ready()).toHaveLength(1);
  });

  it('stacks two hand-picked lines instead of merging them', () => {
    scanner.addWithoutBarcode({ id: 7, name: 'Farine T55' });
    scanner.addWithoutBarcode({ id: 9, name: 'Sucre' });

    // Le regroupement du scan se fait sur le code : sans code, deux ajouts sont
    // deux lots, chacun avec sa DLC.
    expect(scanner.lines()).toHaveLength(2);
  });

  it('creates the batch of a barcodeless line without attaching anything', async () => {
    scanner.addWithoutBarcode({ id: 7, name: 'Farine T55' });
    scanner.bump(scanner.lines()[0].id, 4);

    const validated = scanner.validate();
    http.expectNone((r) => r.url.includes('/barcodes'));
    const req = http.expectOne(`${baseUrl}/stock-batches`);
    expect(req.request.body).toEqual({ goodId: 7, quantity: 5, expirationDate: null });
    req.flush({ id: 1 });
    await tick();
    http.match((r) => r.url.endsWith('/stocks')).forEach((r) => r.flush([]));
    http.match((r) => r.url.endsWith('/categories')).forEach((r) => r.flush([]));
    await validated;

    expect(scanner.lines()).toHaveLength(0);
  });

  /** Deux paquets du même produit, deux DLC : les deux lignes doivent vivre. */
  it('keeps a scanned line and a hand-picked line of the same good apart', async () => {
    const scanned = scanner.onBarcode('3268754117904');
    flushLookup('3268754117904', {
      id: 7,
      name: 'Moutarde',
      unit: 'pcs',
      brand: '',
      categoryId: 2,
    });
    await scanned;

    scanner.addWithoutBarcode({ id: 7, name: 'Moutarde' });

    expect(scanner.lines()).toHaveLength(2);
  });
});

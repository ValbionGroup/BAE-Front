import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideMockStore } from '@ngrx/store/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Stocks } from './stocks';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { PrintService } from '#core/services/print/print-service';
import { ModalService } from '#shared/components/modal/modal.service';
import { StockEntryModal } from '#shared/components/modal/stock-entry-modal/stock-entry-modal';
import { StockExitModal } from '#shared/components/modal/stock-exit-modal/stock-exit-modal';

describe(Stocks.name, () => {
  let component: Stocks;
  let fixture: ComponentFixture<Stocks>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Stocks],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        // La page lit les permissions pour conditionner les gestes de tarif.
        provideMockStore({ initialState: { auth: { permissions: ['stock:read', 'good:write'] } } }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Stocks);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps its topbar actions after the products land', async () => {
    http
      .expectOne((r) => r.url.endsWith('/stocks'))
      .flush([
        {
          id: 1,
          name: 'Bière',
          unit: 'btl',
          brand: null,
          categoryId: 2,
          categoryName: 'Boisson',
          supplierId: null,
          totalRemainingQty: 12,
          batchCount: 1,
          nearestExpirationDate: null,
          expiredBatchCount: 0,
          soonBatchCount: 0,
        },
      ]);
    http.expectOne((r) => r.url.endsWith('/categories')).flush([{ id: 2, name: 'Boisson' }]);
    await fixture.whenStable();
    fixture.detectChanges();

    // `PageHeaderService.set()` remet les actions à `null`. Tant que le
    // rafraîchissement du sous-titre vivait dans un effect séparé, il passait
    // après celui qui pousse le gabarit et effaçait les trois boutons dès le
    // premier chargement : la topbar restait vide, sans erreur nulle part.
    expect(TestBed.inject(PageHeaderService).actions()).not.toBeNull();
  });

  it('shows the lot number and marks the first non-expired batch', async () => {
    http
      .expectOne((r) => r.url.endsWith('/stocks'))
      .flush([
        {
          id: 1,
          name: 'Saucisses',
          unit: 'pcs',
          brand: null,
          categoryId: 2,
          categoryName: 'Frais',
          supplierId: null,
          totalRemainingQty: 14,
          batchCount: 2,
          nearestExpirationDate: null,
          expiredBatchCount: 1,
          soonBatchCount: 1,
        },
      ]);
    http.expectOne((r) => r.url.endsWith('/categories')).flush([{ id: 2, name: 'Frais' }]);
    await fixture.whenStable();

    // Accès par index : `select` et `firstToTakeId` sont `protected`, et
    // TypeScript autorise explicitement cette échappatoire depuis un test.
    // Passer par un clic dans le gabarit ferait dépendre le test de la
    // structure de la ligne de tableau, qui n'a pas de sélecteur stable.
    (component as unknown as { select(id: number): void }).select(1);
    await fixture.whenStable();

    const past = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const soon = new Date(Date.now() + 3 * 86_400_000).toISOString();
    http
      .expectOne((r) => r.url.includes('/stocks/1/batches'))
      .flush([
        {
          id: 41,
          goodsId: 1,
          restockId: null,
          label: 'L26-1',
          initialQty: 6,
          remainingQty: 4,
          expirationDate: past,
          openedAt: null,
        },
        {
          id: 42,
          goodsId: 1,
          restockId: null,
          label: 'L26-2',
          initialQty: 10,
          remainingQty: 10,
          expirationDate: soon,
          openedAt: null,
        },
      ]);
    // `whenStable()` ne suffit pas : la page charge ses lots par une promesse
    // nue (`lastValueFrom(...).then(...)`), et en mode zoneless Angular n'en a
    // aucune connaissance — son ordonnanceur est au repos avant que la chaîne
    // n'aboutisse. Il faut céder la main à la file de microtâches.
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    // Le panneau montrait `#<id>`, une clé technique : « prends le lot n°4 »
    // suppose le numéro lisible que porte `stock_batches.label`.
    expect(text).toContain('#L26-1');
    expect(text).toContain('#L26-2');
    // Le lot périmé n'est JAMAIS celui qu'on propose de prendre : le FEFO sert
    // à ne pas gâcher, pas à faire manger du périmé.
    expect((component as unknown as { firstToTakeId(): number | null }).firstToTakeId()).toBe(42);
    expect(text.match(/prendre en 1er/g)).toHaveLength(1);
  });

  it('calls PrintService.download when "Inventaire" is clicked', () => {
    const printService = TestBed.inject(PrintService);
    const downloadSpy = vi.spyOn(printService, 'download').mockImplementation(() => {});

    component['printInventory']();

    expect(downloadSpy).toHaveBeenCalledWith('/stock-batches/inventory/pdf', expect.any(String));
    vi.restoreAllMocks();
  });

  it('prints a label for the given batch id', () => {
    const printService = TestBed.inject(PrintService);
    const downloadSpy = vi.spyOn(printService, 'download').mockImplementation(() => {});

    component['printLabels'](7);

    expect(downloadSpy).toHaveBeenCalledWith('/stock-batches/labels/pdf?ids=7', expect.any(String));
    vi.restoreAllMocks();
  });

  /**
   * Le panneau de tarifs. ⚠️ L'assertion qui compte est le badge « Référence » :
   * c'est le seul endroit de l'application qui dise **quel** prix décide du coût
   * de recette, de la liste de courses et du bilan.
   */
  it('montre les tarifs, du moins cher au plus cher, et nomme la référence', async () => {
    http
      .expectOne((r) => r.url.endsWith('/stocks'))
      .flush([
        {
          id: 7,
          name: 'Farine T55',
          unit: 'kg',
          brand: null,
          categoryId: null,
          categoryName: null,
          supplierId: null,
          totalRemainingQty: 0,
          batchCount: 0,
          nearestExpirationDate: null,
          expiredBatchCount: 0,
          soonBatchCount: 0,
        },
      ]);
    http.expectOne((r) => r.url.endsWith('/categories')).flush([]);
    await fixture.whenStable();

    (component as unknown as { select(id: number): void }).select(7);
    await fixture.whenStable();
    // La sélection déclenche deux effects : les lots et les tarifs. On vide.
    for (const request of http.match(() => true)) request.flush([]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    component['prices'].set({
      id: 7,
      name: 'Farine T55',
      unit: 'kg',
      suppliers: [
        { id: 2, name: 'Metro', price: 220 },
        { id: 1, name: 'Leclerc', price: 400 },
      ],
      bestSupplier: { id: 2, name: 'Metro', price: 220 },
      bestPrice: 220,
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Metro');
    expect(text).toContain('2,20');
    expect(text).toContain('Référence');
  });

  /** L'unité est dite en clair : rien ne normalise les conditionnements. */
  it('annonce le prix comme étant celui de l’unité de stock', async () => {
    http.expectOne((r) => r.url.endsWith('/stocks')).flush([]);
    http.expectOne((r) => r.url.endsWith('/categories')).flush([]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    component['prices'].set({
      id: 7,
      name: 'Farine T55',
      unit: 'kg',
      suppliers: [],
      bestSupplier: null,
      bestPrice: null,
    });

    expect(component['priceUnitLabel']()).toBe('Prix par kg');
  });

  /**
   * L'entrée manuelle est l'autre porte du stock : le scanner ne sait rien
   * faire d'un sac de farine en vrac, d'un fût ou d'un don — rien de tout cela
   * ne porte d'EAN.
   */
  it('ouvre l’entrée de stock sans denrée imposée depuis la topbar', () => {
    const open = vi.spyOn(TestBed.inject(ModalService), 'open').mockReturnValue('id');

    component['openStockEntry']();

    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({
        component: StockEntryModal,
        inputs: expect.objectContaining({ goodId: null }),
      }),
    );
    vi.restoreAllMocks();
  });

  it('préremplit la denrée quand l’entrée part du panneau', async () => {
    await selectFirstProduct();
    const open = vi.spyOn(TestBed.inject(ModalService), 'open').mockReturnValue('id');

    component['openStockEntry']();

    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({ inputs: expect.objectContaining({ goodId: 1 }) }),
    );
    vi.restoreAllMocks();
  });

  it('ouvre la sortie partielle sur le lot désigné', async () => {
    await selectFirstProduct();
    const open = vi.spyOn(TestBed.inject(ModalService), 'open').mockReturnValue('id');

    const batch = component['selectedBatches']()[0];
    component['openStockExit'](batch);

    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({
        component: StockExitModal,
        inputs: expect.objectContaining({ goodId: 1, unit: 'pcs', batch }),
      }),
    );
    vi.restoreAllMocks();
  });

  /** Charge la page, sélectionne la première denrée et sert ses lots. */
  async function selectFirstProduct(): Promise<void> {
    http
      .expectOne((r) => r.url.endsWith('/stocks'))
      .flush([
        {
          id: 1,
          name: 'Saucisses',
          unit: 'pcs',
          brand: null,
          categoryId: 2,
          categoryName: 'Frais',
          supplierId: null,
          totalRemainingQty: 14,
          batchCount: 1,
          nearestExpirationDate: null,
          expiredBatchCount: 0,
          soonBatchCount: 0,
        },
      ]);
    http.expectOne((r) => r.url.endsWith('/categories')).flush([{ id: 2, name: 'Frais' }]);
    await fixture.whenStable();

    void component['select'](1);
    // `whenStable()` laisse l'effect qui suit `selectedId` émettre sa requête.
    await fixture.whenStable();
    http
      .expectOne((r) => r.url.includes('/stocks/1/batches'))
      .flush([
        {
          id: 42,
          goodsId: 1,
          restockId: null,
          label: 'L26-4',
          initialQty: 14,
          remainingQty: 14,
          expirationDate: null,
          openedAt: null,
        },
      ]);
    http.match((r) => r.url.endsWith('/goods/1')).forEach((r) => r.flush({ suppliers: [] }));
    // La page charge ses lots par une promesse nue : en zoneless, l'ordonnanceur
    // est au repos avant que la chaîne n'aboutisse.
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }
});

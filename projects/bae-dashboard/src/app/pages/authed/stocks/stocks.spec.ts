import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Stocks } from './stocks';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { PrintService } from '#core/services/print/print-service';
import { StocksStore } from '#core/store/stocks.store';
import { ToastService } from '@bae/ui';
import { ModalService } from '#shared/components/modal/modal.service';
import { StockEntryModal } from '#shared/components/modal/stock-entry-modal/stock-entry-modal';
import { StockExitModal } from '#shared/components/modal/stock-exit-modal/stock-exit-modal';
import type { StockProduct } from './stocks.types';

/** Le référentiel des lieux, chargé par `StocksStore.load()` avec les stocks. */
const STORAGE_LOCATIONS = [
  { id: 7, name: 'Frigo' },
  { id: 8, name: 'Congélateur' },
  { id: 9, name: 'Sec' },
];

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
        provideMockStore({
          initialState: {
            auth: { permissions: ['stock:read', 'good:write', 'good:delete'] },
          },
        }),
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
    http.expectOne((r) => r.url.endsWith('/storage-locations')).flush(STORAGE_LOCATIONS);
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
    http.expectOne((r) => r.url.endsWith('/storage-locations')).flush(STORAGE_LOCATIONS);
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
    http.expectOne((r) => r.url.endsWith('/storage-locations')).flush(STORAGE_LOCATIONS);
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
      products: [],
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
    http.expectOne((r) => r.url.endsWith('/storage-locations')).flush(STORAGE_LOCATIONS);
    await new Promise((resolve) => setTimeout(resolve, 0));

    component['prices'].set({
      id: 7,
      name: 'Farine T55',
      unit: 'kg',
      suppliers: [],
      bestSupplier: null,
      bestPrice: null,
      products: [],
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
    http.expectOne((r) => r.url.endsWith('/storage-locations')).flush(STORAGE_LOCATIONS);
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

  /**
   * ⚠️ L'API ne refuse jamais la suppression d'une denrée : la cascade emporte
   * les lots, leur historique et **la ligne de la denrée dans chaque recette**.
   * Ce décompte est le seul endroit de l'application qui le dise.
   */
  it('annonce les lots et les recettes que la suppression emporterait', async () => {
    await selectFirstProduct();
    vi.spyOn(TestBed.inject(StocksStore), 'getGoodUsage').mockResolvedValue({
      recipeNames: ['Crêpes', 'Gâteau'],
      complete: true,
    });
    const open = vi.spyOn(TestBed.inject(ModalService), 'open').mockReturnValue('id');

    component['toggleSelect'](1);
    await component['confirmDeleteGoods']();

    const config = open.mock.calls.at(0)?.at(0) as unknown as {
      type: string;
      details?: string;
      message: string;
    };
    expect(config.type).toBe('delete');
    expect(config.message).toContain('Saucisses');
    expect(config.details).toContain('1 lot');
    expect(config.details).toContain('Crêpes');
    expect(config.details).toContain('Gâteau');
    vi.restoreAllMocks();
  });

  /** Un relevé incomplet se dit, il ne se tait pas. */
  it('avertit quand les recettes n’ont pas pu être lues', async () => {
    await selectFirstProduct();
    vi.spyOn(TestBed.inject(StocksStore), 'getGoodUsage').mockResolvedValue({
      recipeNames: [],
      complete: false,
    });
    const open = vi.spyOn(TestBed.inject(ModalService), 'open').mockReturnValue('id');

    component['toggleSelect'](1);
    await component['confirmDeleteGoods']();

    const config = open.mock.calls.at(0)?.at(0) as unknown as { details?: string };
    expect(config.details).toContain('n’a pas pu être vérifié');
    vi.restoreAllMocks();
  });

  it('supprime, vide la sélection et referme le panneau ouvert', async () => {
    await selectFirstProduct();
    vi.spyOn(TestBed.inject(StocksStore), 'getGoodUsage').mockResolvedValue({
      recipeNames: [],
      complete: true,
    });
    const remove = vi
      .spyOn(TestBed.inject(StocksStore), 'deleteGoods')
      .mockResolvedValue({ deleted: 1, error: null });
    const open = vi.spyOn(TestBed.inject(ModalService), 'open').mockReturnValue('id');

    component['toggleSelect'](1);
    await component['confirmDeleteGoods']();
    const config = open.mock.calls.at(0)?.at(0) as unknown as { onConfirm: () => void };
    config.onConfirm();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(remove).toHaveBeenCalledWith([1]);
    expect(component['selectedIds']().size).toBe(0);
    // Le panneau montrait la denrée qui vient de partir : le laisser ouvert
    // afficherait les lots d'un produit qui n'existe plus.
    expect(component['selectedId']()).toBeNull();
    vi.restoreAllMocks();
  });

  it('n’offre pas la suppression sans le droit good:delete', () => {
    TestBed.inject(MockStore).setState({ auth: { permissions: ['stock:read'] } });

    expect(component['canDelete']()).toBe(false);
  });

  describe('emplacement de stockage', () => {
    it('signale l’emplacement choisi sur la denrée du panneau', async () => {
      await selectFirstProduct();
      const set = vi
        .spyOn(TestBed.inject(StocksStore), 'setStorageLocation')
        .mockResolvedValue(true);

      await component['onStorageLocation'](component['selectedProduct']()!, '7');

      expect(set).toHaveBeenCalledWith(1, 7);
      vi.restoreAllMocks();
    });

    // `''` est l'option « Non précisé » : elle efface, elle n'annule pas le geste.
    it('efface l’emplacement quand « Non précisé » est choisi', async () => {
      await selectFirstProduct();
      const set = vi
        .spyOn(TestBed.inject(StocksStore), 'setStorageLocation')
        .mockResolvedValue(true);

      await component['onStorageLocation'](
        { ...component['selectedProduct']()!, storageLocationId: 9, storageLocationName: 'Sec' },
        '',
      );

      expect(set).toHaveBeenCalledWith(1, null);
      vi.restoreAllMocks();
    });

    /** Le `change` d'un `<select>` se déclenche aussi quand la valeur revient à
     *  elle-même : écrire pour rien ferait un PATCH par ouverture de panneau. */
    it('n’écrit pas quand la valeur ne change pas', async () => {
      await selectFirstProduct();
      const set = vi
        .spyOn(TestBed.inject(StocksStore), 'setStorageLocation')
        .mockResolvedValue(true);

      await component['onStorageLocation'](component['selectedProduct']()!, '');

      expect(set).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });

    it('prévient quand le serveur refuse, plutôt que d’afficher une valeur fausse', async () => {
      await selectFirstProduct();
      vi.spyOn(TestBed.inject(StocksStore), 'setStorageLocation').mockResolvedValue(false);
      const toast = vi.spyOn(TestBed.inject(ToastService), 'show');

      await component['onStorageLocation'](component['selectedProduct']()!, '8');

      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
      vi.restoreAllMocks();
    });

    /**
     * ⚠️ Le libellé vient du **nom rendu par `GET /stocks`**, pas d'un
     * dictionnaire local : la liste des lieux est éditable, et une table de
     * traduction figée dans le front divergerait au premier renommage.
     */
    it('rend un tiret pour une denrée sans emplacement signalé', () => {
      const product = component['selectedProduct']() ?? ({} as StockProduct);
      expect(component['storageLabel']({ ...product, storageLocationName: null })).toBe('—');
      expect(component['storageLabel']({ ...product, storageLocationName: 'Congélateur' })).toBe(
        'Congélateur',
      );
    });

    it('laisse lire l’emplacement sans le droit d’écriture', () => {
      TestBed.inject(MockStore).setState({ auth: { permissions: ['stock:read'] } });

      expect(component['canWriteGood']()).toBe(false);
    });
  });
});

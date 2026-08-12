import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Stocks } from './stocks';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { PrintService } from '#core/services/print/print-service';

describe(Stocks.name, () => {
  let component: Stocks;
  let fixture: ComponentFixture<Stocks>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Stocks],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
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

    expect(downloadSpy).toHaveBeenCalledWith(
      '/stock-batches/inventory/pdf',
      expect.any(String),
    );
    vi.restoreAllMocks();
  });

  it('prints a label for the given batch id', () => {
    const printService = TestBed.inject(PrintService);
    const downloadSpy = vi.spyOn(printService, 'download').mockImplementation(() => {});

    component['printLabels'](7);

    expect(downloadSpy).toHaveBeenCalledWith(
      '/stock-batches/labels/pdf?ids=7',
      expect.any(String),
    );
    vi.restoreAllMocks();
  });
});

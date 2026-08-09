import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Stocks } from './stocks';
import { PageHeaderService } from '#core/services/page-header/page-header-service';

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
});

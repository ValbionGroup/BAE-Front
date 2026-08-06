import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Logistique } from './logistique';
import type { ApiGood, ApiSupplierPrice } from './logistique.types';

function supplier(id: number, name: string, price: number): ApiSupplierPrice {
  return { id, name, price };
}

function good(id: number, name: string, suppliers: ApiSupplierPrice[]): ApiGood {
  const best = suppliers.length > 0 ? suppliers[0] : null;
  return {
    id,
    name,
    unit: 'kg',
    brand: null,
    categoryId: null,
    category: null,
    suppliers,
    bestSupplier: best,
    bestPrice: best?.price ?? null,
  };
}

describe(Logistique.name, () => {
  let component: Logistique;
  let fixture: ComponentFixture<Logistique>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Logistique],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Logistique);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  /** Answers the two page requests and lets the template settle. */
  async function load(goods: ApiGood[]): Promise<void> {
    http.expectOne((r) => r.url.endsWith('/goods')).flush(goods);
    http.expectOne((r) => r.url.endsWith('/vouchers')).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Retailer column headers, i.e. the header cells between "Unité" and "Optimum". */
  function retailerHeaders(): string[] {
    const headers = Array.from(
      fixture.nativeElement.querySelectorAll('thead th'),
    ) as HTMLElement[];
    return headers
      .map((th) => (th.textContent ?? '').trim())
      .filter((text) => text.length > 0 && !['Produit', 'Unité', 'Optimum'].includes(text));
  }

  it('should create', () => {
    expect(component).toBeTruthy();
    http.expectOne((r) => r.url.endsWith('/goods')).flush([]);
    http.expectOne((r) => r.url.endsWith('/vouchers')).flush([]);
  });

  it('renders no retailer column when nothing is priced', async () => {
    await load([good(1, 'Saucisses', [])]);

    expect(retailerHeaders()).toEqual([]);
    // The row still renders, flagged as having no price.
    expect(fixture.nativeElement.textContent).toContain('Saucisses');
    expect(fixture.nativeElement.textContent).toContain('Aucun tarif');
  });

  it('renders exactly one retailer column when a single supplier prices the basket', async () => {
    await load([good(1, 'Saucisses', [supplier(3, 'Leclerc', 4.95)])]);

    expect(retailerHeaders()).toEqual(['Leclerc']);
    expect(fixture.nativeElement.textContent).toContain('4,95 €');
  });

  it('derives one column per distinct supplier across all goods', async () => {
    await load([
      good(1, 'Saucisses', [supplier(3, 'Leclerc', 4.95), supplier(1, 'Auchan', 5.4)]),
      good(2, 'Pain', [supplier(3, 'Leclerc', 2.75), supplier(2, 'Carrefour', 2.9)]),
    ]);

    // Leclerc prices both goods, so it leads; Auchan and Carrefour tie on
    // coverage and fall back to alphabetical order.
    expect(retailerHeaders()).toEqual(['Leclerc', 'Auchan', 'Carrefour']);
  });

  it('marks a good a supplier does not stock rather than inventing a price', async () => {
    await load([
      good(1, 'Saucisses', [supplier(1, 'Auchan', 5.4)]),
      good(2, 'Pain', [supplier(2, 'Carrefour', 2.9)]),
    ]);

    expect(retailerHeaders()).toEqual(['Auchan', 'Carrefour']);
    // Every row has a cell per column, and the unstocked ones read as a dash.
    const dashes = Array.from(
      fixture.nativeElement.querySelectorAll('tbody [aria-label="Non référencé"]'),
    );
    expect(dashes).toHaveLength(2);
  });
});

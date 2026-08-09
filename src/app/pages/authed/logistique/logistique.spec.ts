import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { vi } from 'vitest';

import { Logistique } from './logistique';
import { ModalService } from '#shared/components/modal/modal.service';
import { VoucherCreateModal } from '#shared/components/modal/voucher-create-modal/voucher-create-modal';
import type { ApiGood, ApiSupplierPrice, ApiVoucher } from './logistique.types';

/** Le bon que rend `renderLoaded()` — id 1, Leclerc, 50 €. */
const VOUCHER: ApiVoucher = {
  id: 1,
  supplierId: 3,
  supplier: { id: 3, name: 'Leclerc' },
  value: 50,
  expiresAt: '2026-12-31',
  condition: null,
  usedAt: null,
  used: false,
  daysUntilExpiry: 148,
  expired: false,
  warn: false,
};

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

  /** Answers the three page requests and lets the template settle. */
  async function load(goods: ApiGood[], vouchers: ApiVoucher[] = []): Promise<void> {
    http.expectOne((r) => r.url.endsWith('/goods')).flush(goods);
    http.expectOne((r) => r.url.endsWith('/vouchers')).flush(vouchers);
    http.expectOne((r) => r.url.endsWith('/suppliers')).flush([{ id: 3, name: 'Leclerc' }]);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Rend la page chargée avec un bon exploitable par les tests d'écriture. */
  async function renderLoaded(): Promise<void> {
    await load([], [VOUCHER]);
  }

  /** Retailer column headers, i.e. the header cells between "Unité" and "Optimum". */
  function retailerHeaders(): string[] {
    const headers = Array.from(fixture.nativeElement.querySelectorAll('thead th')) as HTMLElement[];
    return headers
      .map((th) => (th.textContent ?? '').trim())
      .filter((text) => text.length > 0 && !['Produit', 'Unité', 'Optimum'].includes(text));
  }

  it('should create', () => {
    expect(component).toBeTruthy();
    http.expectOne((r) => r.url.endsWith('/goods')).flush([]);
    http.expectOne((r) => r.url.endsWith('/vouchers')).flush([]);
    http.expectOne((r) => r.url.endsWith('/suppliers')).flush([]);
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

  it('opens the creation modal from the add button', async () => {
    const opened = vi.spyOn(TestBed.inject(ModalService), 'open');
    await renderLoaded();

    const addButton: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="add-voucher"] button',
    );
    addButton.click();

    expect(opened).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'component', component: VoucherCreateModal }),
    );
  });

  it('names the toggle button after the voucher it acts on', async () => {
    await renderLoaded();

    const toggle: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="toggle-voucher-1"]',
    );
    // Douze boutons « Consommé » dans une liste sont inexploitables au lecteur
    // d'écran, qui les annonce hors de leur contexte visuel.
    expect(toggle.getAttribute('aria-label')).toContain('Leclerc');
    expect(toggle.getAttribute('aria-label')).toContain('50');
  });

  it('sends the toggle to the API when the button is clicked', async () => {
    await renderLoaded();

    const toggle: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="toggle-voucher-1"]',
    );
    toggle.click();

    const req = http.expectOne((r) => r.url.endsWith('/vouchers/1'));
    expect(req.request.method).toBe('PATCH');
    // `usedAt` doit être présent et non nul : c'est ce qui consomme le bon.
    expect(req.request.body.usedAt).toBeTruthy();
    req.flush({ ...VOUCHER, used: true, usedAt: '2026-08-09T12:00:00.000Z' });
    await fixture.whenStable();
  });

  it('no longer shows the read-only padlock', async () => {
    await renderLoaded();

    // Le cadenas était le seul SVG décoratif positionné en absolu dans la
    // carte : le chercher par sa forme DOM, faute de `data-testid` sur un
    // élément qu'on supprime précisément.
    expect(fixture.nativeElement.querySelector('li svg.absolute')).toBeNull();
  });
});

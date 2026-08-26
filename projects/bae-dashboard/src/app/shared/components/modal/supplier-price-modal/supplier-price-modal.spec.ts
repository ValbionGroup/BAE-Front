import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';
import { SupplierPriceModal } from './supplier-price-modal';
import { StocksStore } from '#core/store/stocks.store';
import type { ApiSupplierPrice } from '#core/services/stocks/stocks-service';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe(SupplierPriceModal.name, () => {
  let fixture: ComponentFixture<SupplierPriceModal>;
  let component: SupplierPriceModal;

  async function render(supplierId: number | null, current: ApiSupplierPrice | null = null) {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SupplierPriceModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/v1' },
      ],
    }).compileComponents();

    vi.spyOn(TestBed.inject(StocksStore), 'listSuppliers').mockResolvedValue([
      { id: 1, name: 'Leclerc' },
      { id: 2, name: 'Metro' },
    ]);

    fixture = TestBed.createComponent(SupplierPriceModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'modal-id');
    fixture.componentRef.setInput('goodId', 7);
    fixture.componentRef.setInput('unitLabel', 'Prix par kg');
    fixture.componentRef.setInput('supplierId', supplierId);
    fixture.componentRef.setInput('current', current);
    fixture.componentRef.setInput('taken', supplierId === null ? [1] : []);
    fixture.componentRef.setInput('onDone', () => {});
    fixture.detectChanges();
    await settle();
  }

  /**
   * ⚠️ L'utilisateur saisit des **euros**, la base stocke des **centimes**.
   * `parseEuros` est la seule frontière de conversion du front ; se tromper ici
   * fait un facteur 100 sur le coût de recette et la liste de courses.
   */
  it('convertit les euros saisis en centimes', async () => {
    await render(2);
    const set = vi
      .spyOn(TestBed.inject(StocksStore), 'setSupplierPrice')
      .mockResolvedValue({ ok: true });

    component['onAmount']('4,95');
    await component['submit']();

    expect(set).toHaveBeenCalledWith(7, 2, 495);
  });

  it('reprend le tarif existant, formaté en euros', async () => {
    await render(2, { id: 2, name: 'Metro', price: 495 });

    // `formatCents` rend une virgule française — et `parseEuros` la relit.
    expect(component['amount']()).toBe('4,95');
  });

  it('refuse une saisie illisible sans appeler le serveur', async () => {
    await render(2);
    const set = vi.spyOn(TestBed.inject(StocksStore), 'setSupplierPrice');

    component['onAmount']('à peu près trois euros');
    await component['submit']();

    expect(set).not.toHaveBeenCalled();
  });

  /** Une enseigne déjà tarifée ne doit pas pouvoir l'être deux fois. */
  it('exclut du sélecteur les enseignes déjà tarifées', async () => {
    await render(null);

    expect(component['suppliers']().map((s) => s.name)).toEqual(['Metro']);
  });

  it('garde la modale ouverte quand le serveur refuse', async () => {
    await render(2);
    vi.spyOn(TestBed.inject(StocksStore), 'setSupplierPrice').mockResolvedValue({
      ok: false,
      error: { error: { code: 'E_SUPPLIER_NOT_FOUND', message: "Cette enseigne n'existe pas." } },
    });

    component['onAmount']('4,95');
    await component['submit']();

    expect(component['error']()).toContain("n'existe pas");
  });
});

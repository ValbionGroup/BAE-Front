import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';
import { StocksStore } from '#core/store/stocks.store';
import type { StockBatchRow } from '#pages/authed/stocks/stocks.types';
import { StockExitModal } from './stock-exit-modal';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function batch(overrides: Partial<StockBatchRow> = {}): StockBatchRow {
  return {
    id: 42,
    restockId: null,
    label: 'L26-4',
    initialQty: 12,
    remainingQty: 12,
    dlcLabel: null,
    dlcStatus: 'none',
    openedAt: null,
    ...overrides,
  };
}

describe(StockExitModal.name, () => {
  let fixture: ComponentFixture<StockExitModal>;
  let component: StockExitModal;

  async function render(row: StockBatchRow = batch()) {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [StockExitModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/v1' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StockExitModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'modal-id');
    fixture.componentRef.setInput('goodId', 7);
    fixture.componentRef.setInput('goodName', 'Moutarde');
    fixture.componentRef.setInput('unit', 'pcs');
    fixture.componentRef.setInput('batch', row);
    fixture.componentRef.setInput('onDone', () => {});
    fixture.detectChanges();
    await settle();
  }

  it('sort la quantité saisie du lot désigné', async () => {
    await render();
    const remove = vi
      .spyOn(TestBed.inject(StocksStore), 'removeFromBatch')
      .mockResolvedValue({ ok: true });

    component['onQuantity']('4');
    await component['submit']();

    expect(remove).toHaveBeenCalledWith({ goodId: 7, stockBatchId: 42, quantity: 4 });
  });

  /**
   * L'API refuse déjà en `E_STOCK_INSUFFICIENT`, mais un aller-retour pour dire
   * ce que l'écran sait déjà est une seconde d'attente et un message d'erreur
   * là où une borne suffit.
   */
  it('refuse plus que ce que le lot porte, sans appeler le serveur', async () => {
    await render(batch({ remainingQty: 3 }));
    const remove = vi.spyOn(TestBed.inject(StocksStore), 'removeFromBatch');

    component['onQuantity']('5');
    await component['submit']();

    expect(remove).not.toHaveBeenCalled();
    expect(component['tooMuch']()).toBe(true);
  });

  it('refuse une quantité illisible', async () => {
    await render();
    const remove = vi.spyOn(TestBed.inject(StocksStore), 'removeFromBatch');

    component['onQuantity']('un peu');
    await component['submit']();

    expect(remove).not.toHaveBeenCalled();
  });

  /** Un autre poste a pu servir entre l'ouverture et la validation. */
  it('montre le refus de l’API et garde la modale ouverte', async () => {
    await render();
    vi.spyOn(TestBed.inject(StocksStore), 'removeFromBatch').mockResolvedValue({
      ok: false,
      error: {
        error: { code: 'E_STOCK_INSUFFICIENT', message: 'Ce lot ne porte plus que 2 unité(s).' },
      },
    });

    component['onQuantity']('4');
    await component['submit']();

    expect(component['error']()).toContain('ne porte plus que 2');
  });

  /** Le geste courant : vider ce qui reste. */
  it('propose de sortir tout le restant', async () => {
    await render(batch({ remainingQty: 9 }));

    component['takeAll']();

    expect(component['qty']()).toBe(9);
  });
});

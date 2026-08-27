import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';
import { StocksStore } from '#core/store/stocks.store';
import { StockEntryModal } from './stock-entry-modal';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const apiItems = [
  {
    id: 7,
    name: 'Moutarde',
    unit: 'pcs',
    brand: 'Amora',
    categoryId: 2,
    categoryName: 'Épicerie',
    supplierId: null,
    totalRemainingQty: 4,
    batchCount: 1,
    nearestExpirationDate: null,
    expiredBatchCount: 0,
    soonBatchCount: 0,
  },
  {
    id: 9,
    name: 'Bière blonde',
    unit: 'btl',
    brand: null,
    categoryId: 3,
    categoryName: 'Boisson',
    supplierId: null,
    totalRemainingQty: 0,
    batchCount: 0,
    nearestExpirationDate: null,
    expiredBatchCount: 0,
    soonBatchCount: 0,
  },
];

describe(StockEntryModal.name, () => {
  let fixture: ComponentFixture<StockEntryModal>;
  let component: StockEntryModal;

  async function render(goodId: number | null = null) {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [StockEntryModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/v1' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StockEntryModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'modal-id');
    fixture.componentRef.setInput('goodId', goodId);
    fixture.componentRef.setInput('onDone', () => {});
    fixture.detectChanges();

    // La modale charge le catalogue : elle s'ouvre aussi depuis un écran qui ne
    // l'a pas déjà en mémoire.
    const http = TestBed.inject(HttpTestingController);
    http.match((r) => r.url.endsWith('/stocks')).forEach((r) => r.flush(apiItems));
    http.match((r) => r.url.endsWith('/categories')).forEach((r) => r.flush([]));
    http.match((r) => r.url.endsWith('/storage-locations')).forEach((r) => r.flush([]));
    await settle();
    fixture.detectChanges();
  }

  /** Ouverte depuis le panneau d'une denrée, elle ne redemande pas laquelle. */
  it('reprend la denrée que l’appelant désigne', async () => {
    await render(7);

    expect(component['picked']()?.name).toBe('Moutarde');
  });

  it('cherche la denrée par marque autant que par nom', async () => {
    await render(null);

    component['onQuery']('amora');

    expect(component['results']().map((p) => p.id)).toEqual([7]);
  });

  it('entre le lot avec la quantité et la DLC saisies', async () => {
    await render(7);
    const create = vi.spyOn(TestBed.inject(StocksStore), 'createBatch').mockResolvedValue({
      ok: true,
    });

    component['onQuantity']('12');
    component['onExpiration']('2026-11-04');
    await component['submit']();

    expect(create).toHaveBeenCalledWith({
      goodId: 7,
      quantity: 12,
      expirationDate: '2026-11-04',
    });
  });

  /** Tout ne périme pas : une DLC vide part à `null`, pas en chaîne vide. */
  it('envoie une DLC nulle quand le champ reste vide', async () => {
    await render(7);
    const create = vi.spyOn(TestBed.inject(StocksStore), 'createBatch').mockResolvedValue({
      ok: true,
    });

    component['onQuantity']('3');
    await component['submit']();

    expect(create).toHaveBeenCalledWith({
      goodId: 7,
      quantity: 3,
      expirationDate: null,
    });
  });

  it('refuse une quantité illisible sans appeler le serveur', async () => {
    await render(7);
    const create = vi.spyOn(TestBed.inject(StocksStore), 'createBatch');

    component['onQuantity']('deux cageots');
    await component['submit']();

    expect(create).not.toHaveBeenCalled();
  });

  it('ne fait rien tant qu’aucune denrée n’est choisie', async () => {
    await render(null);
    const create = vi.spyOn(TestBed.inject(StocksStore), 'createBatch');

    component['onQuantity']('3');
    await component['submit']();

    expect(create).not.toHaveBeenCalled();
  });

  it('garde la modale ouverte et montre le refus de l’API', async () => {
    await render(7);
    vi.spyOn(TestBed.inject(StocksStore), 'createBatch').mockResolvedValue({
      ok: false,
      error: { error: { code: 'E_ROW_NOT_FOUND', message: 'Cette denrée n’existe plus.' } },
    });

    component['onQuantity']('3');
    await component['submit']();

    expect(component['error']()).toContain('n’existe plus');
  });
});

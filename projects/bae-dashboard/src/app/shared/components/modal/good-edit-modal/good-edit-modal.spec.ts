import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';

import { GoodEditModal } from './good-edit-modal';
import type { StockProduct } from '#pages/authed/stocks/stocks.types';

const baseUrl = 'http://api.test/v1';

/**
 * L'emplacement de stockage est **facultatif** à la création : le `<select>`
 * porte une option vide, et c'est cette option-là qui doit atteindre l'API en
 * `null`. Une chaîne vide serait refusée par l'enum côté back.
 */
describe(`${GoodEditModal.name} — emplacement de stockage`, () => {
  let fixture: ComponentFixture<GoodEditModal>;
  let http: HttpTestingController;

  /** Le composant expose ses membres en `protected` : le gabarit y accède,
   *  pas le test. On passe donc par un cast, comme les autres specs de modale. */
  function internals(component: GoodEditModal): {
    onName(v: string): void;
    onUnit(v: string): void;
    onCategoryId(v: string): void;
    onStorageLocation(v: string): void;
    submit(): Promise<void>;
  } {
    return component as unknown as ReturnType<typeof internals>;
  }

  async function render() {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [GoodEditModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GoodEditModal);
    fixture.componentRef.setInput('id', 'modal-1');
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  /** Renseigne le minimum valide, puis envoie. Rend le corps de la requête. */
  async function submitWith(storageLocationId: string): Promise<Record<string, unknown>> {
    const component = await render();
    const api = internals(component);
    api.onName('Steaks hachés');
    api.onUnit('pcs');
    api.onCategoryId('2');
    api.onStorageLocation(storageLocationId);

    const pending = api.submit();
    const req = http.expectOne(`${baseUrl}/goods`);
    req.flush({ id: 1, name: 'Steaks hachés', unit: 'pcs', brand: '', categoryId: 2 });
    await pending;
    return req.request.body;
  }

  it('envoie null quand aucun emplacement n’est choisi', async () => {
    const body = await submitWith('');

    expect(body['storageLocationId']).toBeNull();
  });

  /** ⚠️ Un **nombre**, pas la chaîne du `<select>` : le validateur back attend
   *  un entier, et `'7'` partirait en 422. */
  it('envoie l’identifiant choisi, converti en nombre', async () => {
    const body = await submitWith('7');

    expect(body['storageLocationId']).toBe(7);
  });
});

/**
 * L'édition d'une denrée déjà au catalogue. Elle passe par la **même** modale :
 * c'est le même formulaire, la même validation, et `PATCH /goods/:id` ne touche
 * qu'aux clés reçues.
 */
describe(`${GoodEditModal.name} — édition`, () => {
  let fixture: ComponentFixture<GoodEditModal>;
  let http: HttpTestingController;

  const product: StockProduct = {
    id: 12,
    name: 'Cornichons',
    unit: 'pcs',
    brand: 'Maille',
    categoryId: 2,
    categoryName: 'Épicerie',
    totalQty: 9,
    batchCount: 2,
    nearestDlc: null,
    nearestDlcStatus: 'none',
    expiredBatchCount: 0,
    soonBatchCount: 0,
    storageLocationId: 7,
    storageLocationName: 'Sec',
  };

  function internals(component: GoodEditModal): {
    name(): string;
    brand(): string;
    categoryId(): string;
    storageLocationId(): string;
    editing(): boolean;
    onName(v: string): void;
    submit(): Promise<void>;
  } {
    return component as unknown as ReturnType<typeof internals>;
  }

  async function render() {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [GoodEditModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GoodEditModal);
    fixture.componentRef.setInput('id', 'modal-1');
    fixture.componentRef.setInput('product', product);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('reprend la denrée dans le formulaire', async () => {
    const api = internals(await render());

    expect(api.editing()).toBe(true);
    expect(api.name()).toBe('Cornichons');
    expect(api.brand()).toBe('Maille');
    expect(api.categoryId()).toBe('2');
    expect(api.storageLocationId()).toBe('7');
  });

  /**
   * ⚠️ **`unit` n'est pas dans le corps.** Passer une denrée de `kg` à `pcs` ne
   * convertit rien : les quantités de tous ses lots et tous ses tarifs
   * d'enseigne sont exprimés dans cette unité et deviendraient faux en silence.
   */
  it('envoie un PATCH sans toucher à l’unité', async () => {
    const api = internals(await render());
    api.onName('Cornichons aigres-doux');

    const pending = api.submit();
    const request = http.expectOne(`${baseUrl}/goods/12`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      name: 'Cornichons aigres-doux',
      brand: 'Maille',
      categoryId: 2,
      storageLocationId: 7,
    });
    request.flush({ ...product, name: 'Cornichons aigres-doux' });
    await pending;
  });
});

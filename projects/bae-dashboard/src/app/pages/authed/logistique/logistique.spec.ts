import { ViewContainerRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { vi } from 'vitest';

import { Logistique } from './logistique';
import { ModalService } from '#shared/components/modal/modal.service';
import { ToastService } from '@bae/ui';
import { findA11yViolations } from '@bae/ui/testing';
import { VoucherCreateModal } from '#shared/components/modal/voucher-create-modal/voucher-create-modal';
import { VoucherEditModal } from '#shared/components/modal/voucher-edit-modal/voucher-edit-modal';
import { PrintService } from '#core/services/print/print-service';
import type { ApiShoppingList, ApiShoppingLine, ApiVoucher } from './logistique.types';

/** Le bon que rend `renderLoaded()` — id 1, Leclerc, 50 € (5000 centimes). */
const VOUCHER: ApiVoucher = {
  id: 1,
  supplierId: 3,
  supplier: { id: 3, name: 'Leclerc' },
  value: 5000,
  expiresAt: '2026-12-31',
  condition: null,
  usedAt: null,
  used: false,
  daysUntilExpiry: 148,
  expired: false,
  warn: false,
};

function shoppingLine(overrides: Partial<ApiShoppingLine> = {}): ApiShoppingLine {
  return {
    kind: 'good',
    id: 1,
    name: 'Saucisses',
    unit: 'kg',
    brand: null,
    categoryName: 'Sec',
    needQty: 10,
    stockQty: 0,
    missingQty: 10,
    suppliers: [],
    bestSupplier: null,
    bestPrice: null,
    ...overrides,
  };
}

function shoppingList(overrides: Partial<ApiShoppingList> = {}): ApiShoppingList {
  return {
    eventId: 7,
    eventName: 'Soirée Hivernale',
    totals: { optimumGoodsTotal: 0, furnitureTotal: 0 },
    lines: [],
    lineCount: 0,
    optimumTotal: 0,
    supplierTotals: [],
    savings: null,
    unpricedCount: 0,
    ...overrides,
  };
}

describe(Logistique.name, () => {
  let component: Logistique;
  let fixture: ComponentFixture<Logistique>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Logistique],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        // La page lit `:id` sur le snapshot, jamais réactivement : un stub
        // fixe suffit, pas besoin de simuler une navigation.
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Logistique);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  /** Conteneurs créés par `renderTopbarActions`, retirés après chaque test. */
  const hosts: HTMLElement[] = [];

  afterEach(() => {
    for (const host of hosts.splice(0)) host.remove();
    http.verify();
    vi.restoreAllMocks();
  });

  /** Répond aux quatre appels que fait `ngOnInit` (catalogue/bons/enseignes + liste de courses). */
  async function load(
    vouchers: ApiVoucher[] = [],
    list: ApiShoppingList = shoppingList(),
  ): Promise<void> {
    http.expectOne((r) => r.url.endsWith('/vouchers')).flush(vouchers);
    http.expectOne((r) => r.url.endsWith('/suppliers')).flush([{ id: 3, name: 'Leclerc' }]);
    http.expectOne((r) => r.url.endsWith('/events/7/shopping-list')).flush(list);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Rend la page chargée avec un bon exploitable par les tests d'écriture. */
  async function renderLoaded(list: ApiShoppingList = shoppingList()): Promise<void> {
    await load([VOUCHER], list);
  }

  /**
   * Instancie le gabarit d'actions que la page pousse dans la topbar.
   *
   * Ces boutons vivent dans un `<ng-template #actions>` rendu par la topbar via
   * `ngTemplateOutlet`, jamais dans le corps de la page : sur un fixture qui
   * n'instancie que la page, ils n'existent pas dans le DOM tant qu'on ne les
   * crée pas soi-même. On les rattache au document pour que les clics partent
   * réellement.
   */
  function renderTopbarActions(): HTMLElement {
    const tpl = TestBed.inject(PageHeaderService).actions();
    expect(tpl).not.toBeNull();

    const vcr = fixture.componentRef.injector.get(ViewContainerRef);
    const view = vcr.createEmbeddedView(tpl!);
    view.detectChanges();

    const host = document.createElement('div');
    for (const node of view.rootNodes as Node[]) host.appendChild(node);
    document.body.appendChild(host);
    hosts.push(host);
    return host;
  }

  /** Rend la page avec un 403 sur la seule branche des bons d'achat. */
  async function renderVouchersForbidden(): Promise<void> {
    http
      .expectOne((r) => r.url.endsWith('/vouchers'))
      .flush({ message: 'Missing permission: voucher:read' }, { status: 403, statusText: 'x' });
    http.expectOne((r) => r.url.endsWith('/suppliers')).flush([{ id: 3, name: 'Leclerc' }]);
    http
      .expectOne((r) => r.url.endsWith('/events/7/shopping-list'))
      .flush(shoppingList({ lines: [shoppingLine()], lineCount: 1 }));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Rend la page avec un 403 sur la seule branche de la liste de courses. */
  async function renderShoppingListForbidden(): Promise<void> {
    http.expectOne((r) => r.url.endsWith('/vouchers')).flush([VOUCHER]);
    http.expectOne((r) => r.url.endsWith('/suppliers')).flush([{ id: 3, name: 'Leclerc' }]);
    http
      .expectOne((r) => r.url.endsWith('/events/7/shopping-list'))
      .flush({ message: 'Missing permission: stock:read' }, { status: 403, statusText: 'x' });
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Retailer column headers, i.e. the header cells between "Qté" and "Optimum". */
  function retailerHeaders(): string[] {
    const headers = Array.from(fixture.nativeElement.querySelectorAll('thead th')) as HTMLElement[];
    return headers
      .map((th) => (th.textContent ?? '').trim())
      .filter((text) => text.length > 0 && !['Produit', 'Qté', 'Optimum', 'Prix'].includes(text));
  }

  it('should create', async () => {
    expect(component).toBeTruthy();
    await load();
  });

  it('demande la liste de courses de la soirée du segment de route', async () => {
    // L'id vient du stub `ActivatedRoute` (`7`) : la requête doit cibler cette
    // soirée précisément, pas une autre.
    http.expectOne((r) => r.url.endsWith('/vouchers')).flush([]);
    http.expectOne((r) => r.url.endsWith('/suppliers')).flush([]);
    const req = http.expectOne((r) => r.url.includes('/shopping-list'));
    expect(req.request.url).toContain('/events/7/shopping-list');
    req.flush(shoppingList());
    await fixture.whenStable();
  });

  it('affiche les quatre KPIs de la soirée', async () => {
    await renderLoaded(
      shoppingList({
        lines: [shoppingLine()],
        lineCount: 4,
        optimumTotal: 4250,
        savings: 525,
      }),
    );

    expect(
      fixture.nativeElement.querySelector('[data-testid="kpi-line-count"]').textContent.trim(),
    ).toBe('4');
    expect(
      fixture.nativeElement.querySelector('[data-testid="kpi-optimum"]').textContent,
    ).toContain('42,50');
    expect(
      fixture.nativeElement.querySelector('[data-testid="kpi-savings"]').textContent,
    ).toContain('5,25');
    // Le bon chargé vaut 50 €, ni utilisé ni expiré : entièrement utilisable.
    expect(
      fixture.nativeElement.querySelector('[data-testid="kpi-vouchers"]').textContent,
    ).toContain('50,00');
  });

  it('affiche « — » pour l’économie quand aucune enseigne ne couvre toute la liste', async () => {
    await renderLoaded(shoppingList({ savings: null }));

    expect(
      fixture.nativeElement.querySelector('[data-testid="kpi-savings"]').textContent.trim(),
    ).toBe('—');
  });

  it('sépare les denrées du non-alimentaire', () => {
    // furnitures n'a aucune relation fournisseur : ces lignes ne peuvent pas
    // figurer dans un tableau à colonnes d'enseignes.
    const lines = [
      { kind: 'good', id: 1, name: 'Pain' },
      { kind: 'furniture', id: 2, name: 'Barquettes' },
    ] as never;
    expect(component['goodLines'](lines).map((l) => l.id)).toEqual([1]);
    expect(component['furnitureLines'](lines).map((l) => l.id)).toEqual([2]);
    // Requêtes obligatoires : on solde celles ouvertes par `beforeEach`.
    http.expectOne((r) => r.url.endsWith('/vouchers')).flush([]);
    http.expectOne((r) => r.url.endsWith('/suppliers')).flush([]);
    http.expectOne((r) => r.url.endsWith('/events/7/shopping-list')).flush(shoppingList());
  });

  it('rend deux sections distinctes dans le gabarit, denrées et non-alimentaire', async () => {
    await renderLoaded(
      shoppingList({
        lines: [
          shoppingLine({ kind: 'good', id: 1, name: 'Pain hot-dog' }),
          shoppingLine({
            kind: 'furniture',
            id: 2,
            name: 'Barquettes',
            suppliers: [],
            bestPrice: 3.2,
          }),
        ],
        lineCount: 2,
      }),
    );

    const goodsSection = fixture.nativeElement.querySelector('[data-testid="section-goods"]');
    const furnitureSection = fixture.nativeElement.querySelector(
      '[data-testid="section-furniture"]',
    );
    expect(goodsSection.textContent).toContain('Pain hot-dog');
    expect(goodsSection.textContent).not.toContain('Barquettes');
    expect(furnitureSection.textContent).toContain('Barquettes');
    expect(furnitureSection.textContent).not.toContain('Pain hot-dog');
  });

  it('affiche la colonne Qté avec le manque, pas le besoin brut', async () => {
    await renderLoaded(
      shoppingList({
        lines: [shoppingLine({ needQty: 140, stockQty: 20, missingQty: 120, unit: 'pcs' })],
        lineCount: 1,
      }),
    );

    // 140 (besoin) ne doit apparaître nulle part comme quantité affichée :
    // c'est 120 (le manque) que l'équipe doit acheter, pas la production totale.
    const goodsSection = fixture.nativeElement.querySelector('[data-testid="section-goods"]');
    expect(goodsSection.textContent).toContain('120 pcs');
  });

  it('arrondit les quantités de la liste à deux décimales', async () => {
    // `missingQty` est un besoin fractionnaire moins un stock : le flottant y
    // laisse ses artefacts, et « 2.5999999999999996 kg » n'est pas une ligne
    // de liste de courses. Un entier, lui, reste entier.
    expect(component['formatQty'](2.5999999999999996)).toBe('2,6');
    expect(component['formatQty'](2.567)).toBe('2,57');
    expect(component['formatQty'](120)).toBe('120');

    await renderLoaded(
      shoppingList({
        lines: [
          shoppingLine({ needQty: 12.3, stockQty: 9.7, missingQty: 2.5999999999999996 }),
          shoppingLine({ kind: 'furniture', id: 2, name: 'Barquettes', missingQty: 2.567 }),
        ],
        lineCount: 2,
      }),
    );

    const goods = fixture.nativeElement.querySelector('[data-testid="section-goods"]');
    const furniture = fixture.nativeElement.querySelector('[data-testid="section-furniture"]');
    expect(goods.textContent).toContain('2,6 kg');
    expect(furniture.textContent).toContain('2,57 kg');
  });

  it('renders no retailer column when nothing is priced', async () => {
    await renderLoaded(shoppingList({ lines: [shoppingLine({ suppliers: [] })], lineCount: 1 }));

    expect(retailerHeaders()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Saucisses');
    expect(fixture.nativeElement.textContent).toContain('Aucun tarif');
  });

  it('derives one retailer column per distinct supplier priced on the good lines', async () => {
    await renderLoaded(
      shoppingList({
        lines: [
          shoppingLine({
            id: 1,
            name: 'Saucisses',
            suppliers: [
              { id: 3, name: 'Leclerc', price: 495 },
              { id: 1, name: 'Auchan', price: 540 },
            ],
            bestSupplier: { id: 3, name: 'Leclerc', price: 495 },
            bestPrice: 4.95,
          }),
          shoppingLine({
            id: 2,
            name: 'Pain',
            suppliers: [
              { id: 3, name: 'Leclerc', price: 275 },
              { id: 2, name: 'Carrefour', price: 290 },
            ],
            bestSupplier: { id: 3, name: 'Leclerc', price: 275 },
            bestPrice: 2.75,
          }),
        ],
        lineCount: 2,
      }),
    );

    // Leclerc price les deux lignes, donc en tête ; Auchan et Carrefour sont à
    // égalité de couverture et se départagent par ordre alphabétique.
    expect(retailerHeaders()).toEqual(['Leclerc', 'Auchan', 'Carrefour']);
  });

  it('marque une enseigne à couverture incomplète', () => {
    const totals = [
      { id: 3, name: 'Leclerc', total: 38500, fullCoverage: true },
      { id: 4, name: 'Auchan', total: 9000, fullCoverage: false },
    ] as never;
    // Auchan est « moins chère » seulement parce qu'elle compte moins de
    // lignes : la colonne doit le dire, pas laisser croire au meilleur prix.
    expect(component['isComparable'](totals[1])).toBe(false);
    expect(component['cheapestComparable'](totals)?.name).toBe('Leclerc');
    http.expectOne((r) => r.url.endsWith('/vouchers')).flush([]);
    http.expectOne((r) => r.url.endsWith('/suppliers')).flush([]);
    http.expectOne((r) => r.url.endsWith('/events/7/shopping-list')).flush(shoppingList());
  });

  it('affiche le total par enseigne en pied de tableau, avec une marque sur la couverture incomplète', async () => {
    await renderLoaded(
      shoppingList({
        lines: [
          shoppingLine({
            suppliers: [{ id: 4, name: 'Auchan', price: 900 }],
            bestSupplier: { id: 4, name: 'Auchan', price: 900 },
            bestPrice: 900,
          }),
        ],
        lineCount: 1,
        supplierTotals: [{ id: 4, name: 'Auchan', total: 900, fullCoverage: false }],
      }),
    );

    const footer = fixture.nativeElement.querySelector('tfoot');
    expect(footer.textContent).toContain('9,00');
    // L'astérisque n'est pas décoratif : c'est le seul signal visuel qu'un
    // total « bas » ne couvre pas toute la liste.
    expect(footer.querySelector('[aria-hidden="true"]')?.textContent).toBe('*');
  });

  it('affiche l’économie multi-enseigne, et « — » quand elle est indécidable', async () => {
    expect(component['savingsLabel'](1280)).toContain('12,80');
    // null = aucune enseigne ne couvre toute la liste, donc aucune comparaison
    // honnête possible.
    expect(component['savingsLabel'](null)).toBe('—');
    await load();
  });

  it('affiche un bandeau quand des lignes n’ont pas de prix connu', async () => {
    await renderLoaded(shoppingList({ lines: [shoppingLine()], lineCount: 1, unpricedCount: 2 }));

    const banner = fixture.nativeElement.querySelector('[data-testid="unpriced-banner"]');
    expect(banner).not.toBeNull();
    expect(banner.textContent).toContain('2');
  });

  it('n’affiche aucun bandeau quand toutes les lignes ont un prix connu', async () => {
    await renderLoaded(shoppingList({ lines: [shoppingLine()], lineCount: 1, unpricedCount: 0 }));

    expect(fixture.nativeElement.querySelector('[data-testid="unpriced-banner"]')).toBeNull();
  });

  it('affiche un panneau Accès restreint sur un 403 de la liste de courses, KPIs à —', async () => {
    await renderShoppingListForbidden();

    expect(
      fixture.nativeElement.querySelector('[data-testid="shopping-list-forbidden"]'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="kpi-line-count"]').textContent.trim(),
    ).toBe('—');
    expect(
      fixture.nativeElement.querySelector('[data-testid="kpi-optimum"]').textContent.trim(),
    ).toBe('—');
    expect(
      fixture.nativeElement.querySelector('[data-testid="kpi-savings"]').textContent.trim(),
    ).toBe('—');
    // Le panneau des bons est une branche indépendante : le refus sur la liste
    // ne doit rien lui retirer.
    expect(fixture.nativeElement.textContent).toContain('Leclerc');
    expect(
      fixture.nativeElement.querySelector('[data-testid="kpi-vouchers"]').textContent,
    ).toContain('50,00');
  });

  it('distingue une panne réseau d’un refus sur la liste de courses', async () => {
    http.expectOne((r) => r.url.endsWith('/vouchers')).flush([]);
    http.expectOne((r) => r.url.endsWith('/suppliers')).flush([]);
    http
      .expectOne((r) => r.url.endsWith('/events/7/shopping-list'))
      .flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="shopping-list-forbidden"]'),
    ).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();

    // Le bouton Réessayer relance uniquement la branche liste de courses.
    const retryButtons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const retry = retryButtons.find((b) => b.textContent?.includes('Réessayer'));
    retry!.click();
    http.expectOne((r) => r.url.endsWith('/events/7/shopping-list')).flush(shoppingList());
    await fixture.whenStable();
  });

  it('opens the creation modal from the topbar action', async () => {
    const opened = vi.spyOn(TestBed.inject(ModalService), 'open');
    await renderLoaded();

    const addButton = renderTopbarActions().querySelector<HTMLElement>(
      '[data-testid="add-voucher"] button',
    );
    // Le point d'entrée vit dans la topbar, pas à côté du titre de section :
    // c'est là que la maquette le place, et là qu'on le cherche.
    expect(addButton).not.toBeNull();
    addButton!.click();

    expect(opened).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'component', component: VoucherCreateModal }),
    );
  });

  it('opens the edit modal for the clicked voucher', async () => {
    const opened = vi.spyOn(TestBed.inject(ModalService), 'open');
    await renderLoaded();

    const editButton = fixture.nativeElement.querySelector(
      '[data-testid="edit-voucher-1"]',
    ) as HTMLButtonElement;
    expect(editButton).not.toBeNull();
    editButton.click();

    expect(opened).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'component',
        component: VoucherEditModal,
        inputs: { voucherId: 1 },
      }),
    );
  });

  it('deletes the voucher after confirmation', async () => {
    await renderLoaded();

    const deleteButton = fixture.nativeElement.querySelector(
      '[data-testid="delete-voucher-1"]',
    ) as HTMLButtonElement;
    deleteButton.click();
    fixture.detectChanges();

    // `type: 'delete'` rend une modale générique de confirmation — on
    // déclenche `onConfirm` directement, comme `recettes.spec.ts` le fait
    // pour `confirmDelete`, plutôt que de traverser tout `ModalService`.
    const opened = TestBed.inject(ModalService).modals()[0];
    expect(opened.type).toBe('delete');
    (opened as { onConfirm: () => void }).onConfirm();

    // Cette page cible ses requêtes par suffixe d'URL (`endsWith`), jamais par
    // `baseUrl` littéral : elle n'a pas de constante `baseUrl`, contrairement à
    // `logistique.store.spec.ts`.
    http
      .expectOne((r) => r.url.endsWith('/vouchers/1'))
      .flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="toggle-voucher-1"]')).toBeNull();
  });

  /**
   * « Fiche logistique » remplace l'ancien raccourci « Bons d'achat (n) » —
   * le panneau des bons reste atteignable en défilant.
   */
  it('offre une fiche logistique, active depuis que le PDF existe côté API', async () => {
    await renderLoaded();

    const actions = renderTopbarActions();
    expect(actions.textContent).toContain('Fiche logistique');
    expect(actions.textContent).not.toContain("Bons d'achat (");

    // Une seule action reste désactivée : « Preuve d'achat » (aucun stockage
    // de fichiers). « Fiche logistique » est maintenant branchée (doc 1, §17).
    const disabled = actions.querySelectorAll('button[disabled]');
    expect(disabled.length).toBe(1);
  });

  it('calls PrintService.download when "Fiche logistique" is clicked', async () => {
    const printService = TestBed.inject(PrintService);
    const downloadSpy = vi.spyOn(printService, 'download').mockImplementation(() => {});
    await renderLoaded(shoppingList({ eventName: 'Soirée Hivernale' }));

    const button = Array.from(renderTopbarActions().querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Fiche logistique'),
    ) as HTMLButtonElement;
    expect(button).not.toBeNull();
    button.click();

    expect(downloadSpy).toHaveBeenCalledWith('/events/7/shopping-list/pdf', expect.any(String));
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

  it('renders the shopping list without accessibility violations', async () => {
    await renderLoaded();

    expect(await findA11yViolations(fixture.nativeElement)).toEqual([]);
  });

  it('stays focusable while the write is in flight', async () => {
    await renderLoaded();

    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="toggle-voucher-1"]',
    );
    toggle.click();
    const req = http.expectOne((r) => r.url.endsWith('/vouchers/1'));
    fixture.detectChanges();

    // Un élément désactivé perd le focus : la personne au clavier serait
    // rejetée en haut de la page au moment précis où elle agit.
    expect(toggle.disabled).toBe(false);
    expect(toggle.getAttribute('aria-busy')).toBe('true');

    req.flush({ ...VOUCHER, used: true, usedAt: '2026-08-09T12:00:00.000Z' });
    await fixture.whenStable();
  });

  it('confirms a consumption with a toast', async () => {
    const shown = vi.spyOn(TestBed.inject(ToastService), 'show');
    await renderLoaded();

    const toggle: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="toggle-voucher-1"]',
    );
    toggle.click();
    http
      .expectOne((r) => r.url.endsWith('/vouchers/1'))
      .flush({ ...VOUCHER, used: true, usedAt: '2026-08-09T12:00:00.000Z' });
    await fixture.whenStable();

    expect(shown).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Bon consommé' }),
    );
  });

  it('reports a refused consumption in a toast', async () => {
    const shown = vi.spyOn(TestBed.inject(ToastService), 'show');
    await renderLoaded();

    const toggle: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="toggle-voucher-1"]',
    );
    toggle.click();
    http
      .expectOne((r) => r.url.endsWith('/vouchers/1'))
      .flush({ message: 'Bon introuvable.' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(shown).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', message: 'Bon introuvable.' }),
    );
  });

  it('no longer shows the read-only padlock', async () => {
    await renderLoaded();

    // Le cadenas était le seul SVG décoratif positionné en absolu dans la
    // carte : le chercher par sa forme DOM, faute de `data-testid` sur un
    // élément qu'on supprime précisément.
    expect(fixture.nativeElement.querySelector('li svg.absolute')).toBeNull();
  });

  it('shows a restricted panel instead of the vouchers, keeping the shopping list', async () => {
    await renderVouchersForbidden();

    expect(
      fixture.nativeElement.querySelector('[data-testid="vouchers-forbidden"]'),
    ).not.toBeNull();
    // La liste de courses reste rendue : c'est tout l'intérêt de n'avoir
    // restreint que le panneau des bons.
    expect(fixture.nativeElement.textContent).toContain('Saucisses');
    // Proposer d'ajouter un bon à qui n'a pas le droit d'en voir un serait un
    // clic voué au 403 — et le bouton vit désormais dans la topbar, donc c'est
    // là qu'il faut vérifier son absence.
    expect(renderTopbarActions().querySelector('[data-testid="add-voucher"]')).toBeNull();
  });

  it('locks the section label when the vouchers are out of reach', async () => {
    await renderVouchersForbidden();

    // Le vocabulaire de la maquette pour un panneau verrouillé.
    expect(fixture.nativeElement.textContent).toContain('ACCÈS VERROUILLÉ');
  });

  it('reads the usable-voucher KPI as unknown rather than zero', async () => {
    await renderVouchersForbidden();

    const kpi: HTMLElement = fixture.nativeElement.querySelector('[data-testid="kpi-vouchers"]');
    // « 0 € » affirmerait qu'il n'y a aucun bon utilisable ; la vérité est
    // qu'on n'a pas le droit de le savoir.
    expect(kpi.textContent?.trim()).toBe('—');
  });

  it('also reads the usable-voucher KPI as unknown on a load failure other than 403', async () => {
    http
      .expectOne((r) => r.url.endsWith('/vouchers'))
      .flush({ message: 'Erreur serveur' }, { status: 500, statusText: 'x' });
    http.expectOne((r) => r.url.endsWith('/suppliers')).flush([{ id: 3, name: 'Leclerc' }]);
    http.expectOne((r) => r.url.endsWith('/events/7/shopping-list')).flush(shoppingList());
    await fixture.whenStable();
    fixture.detectChanges();

    // Une 500 met `vouchersLoadError`, pas `vouchersForbidden` : le panneau
    // restreint n'a donc pas lieu d'apparaître ici, contrairement au cas 403.
    expect(fixture.nativeElement.querySelector('[data-testid="vouchers-forbidden"]')).toBeNull();

    const kpi: HTMLElement = fixture.nativeElement.querySelector('[data-testid="kpi-vouchers"]');
    expect(kpi.textContent?.trim()).toBe('—');
  });
});

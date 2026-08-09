import { ViewContainerRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
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

  /** Conteneurs créés par `renderTopbarActions`, retirés après chaque test. */
  const hosts: HTMLElement[] = [];

  afterEach(() => {
    for (const host of hosts.splice(0)) host.remove();
    http.verify();
  });

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
  async function renderForbidden(): Promise<void> {
    http.expectOne((r) => r.url.endsWith('/goods')).flush([good(1, 'Saucisses', [])]);
    http
      .expectOne((r) => r.url.endsWith('/vouchers'))
      .flush({ message: 'Missing permission: voucher:read' }, { status: 403, statusText: 'x' });
    http.expectOne((r) => r.url.endsWith('/suppliers')).flush([{ id: 3, name: 'Leclerc' }]);
    await fixture.whenStable();
    fixture.detectChanges();
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

  it('counts the loaded vouchers on the topbar action', async () => {
    await renderLoaded();

    expect(renderTopbarActions().textContent).toContain("Bons d'achat (1)");
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

  it('shows a restricted panel instead of the vouchers, keeping the table', async () => {
    await renderForbidden();

    expect(
      fixture.nativeElement.querySelector('[data-testid="vouchers-forbidden"]'),
    ).not.toBeNull();
    // Le comparatif d'enseignes reste rendu : c'est tout l'intérêt de n'avoir
    // gardé que le panneau.
    expect(fixture.nativeElement.textContent).toContain('Saucisses');
    // Proposer d'ajouter un bon à qui n'a pas le droit d'en voir un serait un
    // clic voué au 403 — et le bouton vit désormais dans la topbar, donc c'est
    // là qu'il faut vérifier son absence.
    expect(renderTopbarActions().querySelector('[data-testid="add-voucher"]')).toBeNull();
  });

  it('locks the section label when the vouchers are out of reach', async () => {
    await renderForbidden();

    // Le vocabulaire de la maquette pour un panneau verrouillé.
    expect(fixture.nativeElement.textContent).toContain('ACCÈS VERROUILLÉ');
  });

  it('reads the usable-voucher KPI as unknown rather than zero', async () => {
    await renderForbidden();

    const kpi: HTMLElement = fixture.nativeElement.querySelector('[data-testid="kpi-vouchers"]');
    // « 0 € » affirmerait qu'il n'y a aucun bon utilisable ; la vérité est
    // qu'on n'a pas le droit de le savoir.
    expect(kpi.textContent?.trim()).toBe('—');
  });

  it('also reads the usable-voucher KPI as unknown on a load failure other than 403', async () => {
    http.expectOne((r) => r.url.endsWith('/goods')).flush([good(1, 'Saucisses', [])]);
    http
      .expectOne((r) => r.url.endsWith('/vouchers'))
      .flush({ message: 'Erreur serveur' }, { status: 500, statusText: 'x' });
    http.expectOne((r) => r.url.endsWith('/suppliers')).flush([{ id: 3, name: 'Leclerc' }]);
    await fixture.whenStable();
    fixture.detectChanges();

    // Une 500 met `vouchersLoadError`, pas `vouchersForbidden` : le panneau
    // restreint n'a donc pas lieu d'apparaître ici, contrairement au cas 403.
    expect(fixture.nativeElement.querySelector('[data-testid="vouchers-forbidden"]')).toBeNull();

    const kpi: HTMLElement = fixture.nativeElement.querySelector('[data-testid="kpi-vouchers"]');
    expect(kpi.textContent?.trim()).toBe('—');
  });
});

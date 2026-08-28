import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { API_BASE_URL } from '@bae/ui';
import type { Permission } from '#core/models/permission.model';
import type { ApiFurniture } from '#core/services/furnitures/furnitures-service';
import { Furnitures } from './furnitures';

const baseUrl = 'http://api.test/v1';

/** La page charge par promesses nues ; en zoneless, Angular ne les suit pas. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const catalogue: ApiFurniture[] = [
  { id: 1, name: 'Gobelet 33 cl', quantity: 240, price: 8 },
  { id: 2, name: 'Nappe papier', quantity: 12, price: 150 },
  { id: 3, name: 'Serviettes', quantity: 0, price: 2 },
];

describe(Furnitures.name, () => {
  let fixture: ComponentFixture<Furnitures>;
  let component: Furnitures;
  let http: HttpTestingController;

  async function render(permissions: Permission[] = ['furniture:read']): Promise<void> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Furnitures],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        provideMockStore({ initialState: { auth: { permissions } } }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Furnitures);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    fixture.detectChanges();
    await settle();

    http.expectOne(`${baseUrl}/furnitures`).flush(catalogue);
    await settle();
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('rend les fournitures du catalogue', async () => {
    await render();

    expect(text()).toContain('Gobelet 33 cl');
    expect(text()).toContain('Serviettes');
  });

  /**
   * La valeur du stock est la seule agrégation de l'écran, et la seule à
   * manipuler des centimes : 240×8 + 12×150 + 0×2 = 3 720 centimes.
   */
  it('compte les références, les ruptures et la valeur du stock', async () => {
    await render();

    const values = component['kpis']().map((kpi) => kpi.value);
    expect(values).toEqual(['3', '1', '37,20 €']);
  });

  it('filtre sur le nom', async () => {
    await render();
    component['setSearch']('nappe');

    expect(component['visible']().map((item) => item.id)).toEqual([2]);
  });

  it('trie par quantité décroissante', async () => {
    await render();
    component['setSort']('quantity');
    component['setSort']('quantity');

    expect(component['visible']().map((item) => item.id)).toEqual([1, 2, 3]);
  });

  /** Sans le droit, l'écran ne propose pas un geste que l'API refusera en 403. */
  it('n’offre ni modification ni suppression sans les droits', async () => {
    await render(['furniture:read']);

    expect(component['canWrite']()).toBe(false);
    expect(component['canDelete']()).toBe(false);
  });

  it('offre les gestes à qui porte les droits', async () => {
    await render(['furniture:read', 'furniture:write', 'furniture:delete']);

    expect(component['canWrite']()).toBe(true);
    expect(component['canDelete']()).toBe(true);
  });
});

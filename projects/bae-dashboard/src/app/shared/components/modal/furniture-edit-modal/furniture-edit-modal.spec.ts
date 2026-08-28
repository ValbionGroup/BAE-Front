import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';
import type { ApiFurniture } from '#core/services/furnitures/furnitures-service';
import { FurnitureEditModal } from './furniture-edit-modal';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe(FurnitureEditModal.name, () => {
  let fixture: ComponentFixture<FurnitureEditModal>;
  let component: FurnitureEditModal;
  let http: HttpTestingController;

  async function render(furniture: ApiFurniture | null = null) {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [FurnitureEditModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/v1' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FurnitureEditModal);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('id', 'modal-id');
    fixture.componentRef.setInput('furniture', furniture);
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
  }

  const cups: ApiFurniture = { id: 4, name: 'Gobelet 33 cl', quantity: 240, price: 8 };

  it('ouvre un formulaire vide en création', async () => {
    await render();

    expect(component['name']()).toBe('');
    expect(component['valid']()).toBe(false);
  });

  /** Le prix vit en centimes côté API et se saisit en euros : `8` → `0,08`. */
  it('pré-remplit le formulaire en édition, prix converti en euros', async () => {
    await render(cups);

    expect(component['name']()).toBe('Gobelet 33 cl');
    expect(component['quantity']()).toBe('240');
    expect(component['amount']()).toBe('0,08');
  });

  it('poste des centimes à la création', async () => {
    await render();
    component['onName']('Serviettes');
    component['onQuantity']('50');
    component['onAmount']('0,02');

    void component['submit']();
    await settle();

    const request = http.expectOne('http://api.test/v1/furnitures');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Serviettes', quantity: 50, price: 2 });
    request.flush(cups);
    await settle();
    http.expectOne('http://api.test/v1/furnitures').flush([cups]);
  });

  it('envoie un PATCH sur la fourniture éditée', async () => {
    await render(cups);
    component['onQuantity']('12');

    void component['submit']();
    await settle();

    const request = http.expectOne('http://api.test/v1/furnitures/4');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ name: 'Gobelet 33 cl', quantity: 12, price: 8 });
    request.flush(cups);
    await settle();
    http.expectOne('http://api.test/v1/furnitures').flush([cups]);
  });

  /**
   * Une quantité est un `integer unsigned` en base : la fraction serait
   * arrondie en silence, le négatif refusé par le serveur. Autant le dire ici.
   */
  it('refuse une quantité qui n’est pas un entier positif ou nul', async () => {
    await render();
    component['onName']('Serviettes');
    component['onAmount']('0,02');

    for (const raw of ['', '-1', '1,5', 'x']) {
      component['onQuantity'](raw);
      expect(component['valid']()).toBe(false);
    }

    // Zéro est légitime : une fourniture en rupture reste au catalogue.
    component['onQuantity']('0');
    expect(component['valid']()).toBe(true);
  });

  it('refuse un prix illisible', async () => {
    await render();
    component['onName']('Serviettes');
    component['onQuantity']('50');
    component['onAmount']('abc');

    expect(component['valid']()).toBe(false);
  });

  afterEach(() => http.verify());
});

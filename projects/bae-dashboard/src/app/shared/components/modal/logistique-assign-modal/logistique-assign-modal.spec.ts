import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';

import { LogistiqueAssignModal } from './logistique-assign-modal';
import { API_BASE_URL } from '@bae/ui';

const baseUrl = 'http://api.test/v1';

describe(LogistiqueAssignModal.name, () => {
  let component: LogistiqueAssignModal;
  let fixture: ComponentFixture<LogistiqueAssignModal>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogistiqueAssignModal],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { auth: {} } }),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LogistiqueAssignModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'modal-id');
    // `eventId` est une entrée requise : la modale écrit sur une soirée précise,
    // et sans elle il n'y a rien à composer.
    fixture.componentRef.setInput('eventId', '7');
    await fixture.whenStable();
    http = TestBed.inject(HttpTestingController);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('n’offre que « Tout » comme catégorie avant l’arrivée du catalogue', () => {
    // Les catégories sont dérivées des recettes chargées — `products` n'a pas de
    // catégorie propre. Tant que rien n'est arrivé, il n'y a rien à dériver.
    expect(component['cats']()).toEqual(['Tout']);
    expect(component['recipes']()).toEqual([]);
  });

  it('demande le catalogue des recettes à l’ouverture', () => {
    // La modale ne peut pas composer un menu sans savoir quelles recettes
    // existent : elle déclenche le chargement plutôt que d'attendre que la page
    // l'ait fait.
    const requests = http.match((request) => request.url.includes('/products/summary'));
    expect(requests.length).toBeGreaterThan(0);
    for (const request of requests) request.flush([]);
  });

  describe('prix de vente', () => {
    /** `cost` et `price` sont tous deux en **centimes**. */
    function recipe(overrides: Record<string, unknown> = {}) {
      return {
        productId: 3,
        n: 'Hot-dog',
        c: 'Plats',
        cost: 112,
        price: 350,
        priceDraft: null,
        sel: true,
        q: 100,
        star: false,
        ...overrides,
      } as never;
    }

    it('calcule la marge sans mélanger les unités', () => {
      // 3,50 € de vente pour 1,12 € de denrées : 2,38 € de marge.
      // L'ancienne formule (`price / 100 - cost`) faisait 3,50 − 112 = −108,50.
      // Sur des entiers, `toBeCloseTo` n'a plus de raison d'être.
      expect(component['marginOf'](recipe())).toBe(238);
      expect(component['marginOf'](recipe({ price: 50 }))).toBe(-62);
    });

    it('affiche le prix en euros, et vide quand il reste à fixer', () => {
      expect(component['priceOf'](recipe())).toBe('3,50');
      expect(component['priceOf'](recipe({ price: 0 }))).toBe('');
      expect(component['priceOf'](recipe({ priceDraft: '4,' }))).toBe('4,');
    });

    it('convertit la saisie en centimes, et ignore une saisie illisible', () => {
      component['allRecipes'].set([recipe()]);

      component['commitPrice']('Hot-dog', '4,20');
      expect(component['allRecipes']()[0].price).toBe(420);

      component['commitPrice']('Hot-dog', 'gratuit');
      expect(component['allRecipes']()[0].price).toBe(420);

      component['commitPrice']('Hot-dog', '-1');
      expect(component['allRecipes']()[0].price).toBe(420);
    });

    it('dérive le revenu prévu du prix saisi, et compte les recettes sans prix', () => {
      component['allRecipes'].set([
        recipe({ price: 350, q: 100 }),
        recipe({ n: 'Frites', productId: 4, price: 0, q: 50 }),
      ]);

      // 100 portions à 350 centimes : 35 000 centimes, plus aucune division.
      expect(component['totalRev']()).toBe(35000);
      expect(component['unpricedSelected']()).toBe(1);
    });
  });

  afterEach(() => {
    // Les requêtes de menu partent selon l'état du store partagé : on les vide
    // sans les asserter, seul le catalogue est le sujet de ce spec.
    for (const request of http.match(() => true)) request.flush([]);
  });
});

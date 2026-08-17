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

  afterEach(() => {
    // Les requêtes de menu partent selon l'état du store partagé : on les vide
    // sans les asserter, seul le catalogue est le sujet de ce spec.
    for (const request of http.match(() => true)) request.flush([]);
  });
});

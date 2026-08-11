import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Caisse } from './caisse';
import { CaisseStore } from '#core/store/caisse.store';

/** La page charge par promesses nues ; en zoneless, Angular ne les suit pas. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe(Caisse.name, () => {
  let component: Caisse;
  let fixture: ComponentFixture<Caisse>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Caisse],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Caisse);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => {
    // Le store est `providedIn: 'root'` : sans ça, une session ouverte par un
    // test fuit dans le suivant.
    TestBed.inject(CaisseStore).endSession();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**
   * ⚠️ La caisse était **inatteignable depuis toujours** : `todayEvent`
   * dérivait d'un `computed(() => null)` inconditionnel, donc l'écran affichait
   * en permanence « aucune soirée programmée », quel que soit l'état réel des
   * soirées.
   */
  it('offers to open on the soirée that is live', async () => {
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([
        { id: '7', name: 'Soirée BBQ', date: '2026-08-20T19:00:00.000Z', status: 'ongoing' },
      ]);
    await settle();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Lancer la session pour Soirée BBQ');
    expect(text).not.toContain("Aucune soirée n'est programmée");
  });

  it('says the till cannot open when no soirée is running', async () => {
    http.expectOne((r) => r.url.endsWith('/events')).flush([]);
    await settle();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain("Aucune soirée n'est programmée");
  });

  /**
   * La grille d'articles lit `sessionEvent()?.menu`, et rien d'autre ne le
   * remplit : ouvrir sans charger le menu donnait une caisse vide, sans erreur.
   */
  it('loads the menu when the session opens', async () => {
    const store = TestBed.inject(CaisseStore);
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([
        { id: '7', name: 'Soirée BBQ', date: '2026-08-20T19:00:00.000Z', status: 'ongoing' },
      ]);
    await settle();

    store.startSession('7');
    await settle();

    http
      .expectOne((r) => r.url.includes('/events/7/products'))
      .flush([
        {
          productId: 1,
          name: 'Hot-dog',
          isVegetarian: false,
          quantity: 200,
          price: 250,
          unitCost: null,
          totalCost: null,
          category: 'Chaud',
        },
      ]);
    await settle();

    expect(store.menu().map((item) => item.name)).toEqual(['Hot-dog']);
  });

  /**
   * La caisse et la vue live doivent désigner la MÊME soirée : deux
   * dérivations séparées finiraient par diverger, et on encaisserait sur une
   * soirée pendant qu'on produirait pour une autre.
   */
  it('picks the soonest event that is not completed', async () => {
    const store = TestBed.inject(CaisseStore);
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([
        { id: '8', name: 'Gala', date: '2026-12-01T19:00:00.000Z', status: 'scheduled' },
        { id: '9', name: 'BBQ', date: '2026-08-20T19:00:00.000Z', status: 'ongoing' },
        { id: '10', name: 'Passée', date: '2026-01-01T19:00:00.000Z', status: 'completed' },
      ]);
    await settle();

    expect(store.todayEvent()?.name).toBe('BBQ');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Caisse } from './caisse';
import { CaisseStore } from '#core/store/caisse.store';

/** La page charge par promesses nues ; en zoneless, Angular ne les suit pas. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Dates relatives à l'exécution : la règle porte sur le jour courant. */
const atHour = (offsetDays: number, hour = 19) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

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
      .flush([{ id: '7', name: 'Soirée BBQ', date: atHour(0), status: 'ongoing' }]);
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
   * ⚠️ Le bug rapporté : la caisse proposait d'encaisser sur une soirée de
   * 2027. « La plus proche à venir » n'est pas la règle — le champ s'appelle
   * `todayEvent` et son état vide parle d'aujourd'hui.
   */
  it('never offers a future soirée, however near', async () => {
    const store = TestBed.inject(CaisseStore);
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([
        { id: '20', name: 'Demain', date: atHour(1), status: 'scheduled' },
        { id: '21', name: 'Dans un an', date: atHour(365), status: 'scheduled' },
      ]);
    await settle();
    fixture.detectChanges();

    expect(store.todayEvent()).toBeNull();
    expect(fixture.nativeElement.textContent as string).toContain("Aucune soirée n'est programmée");
  });

  /** Une soirée explicitement ouverte prime, même si une autre est datée du jour. */
  it('prefers an ongoing soirée over one merely dated today', async () => {
    const store = TestBed.inject(CaisseStore);
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([
        { id: '30', name: 'Prévue ce soir', date: atHour(0, 23), status: 'scheduled' },
        { id: '31', name: 'Ouverte', date: atHour(0, 18), status: 'ongoing' },
      ]);
    await settle();

    expect(store.todayEvent()?.name).toBe('Ouverte');
  });

  /**
   * `new Date()` sur une date absente donne `Invalid Date`, dont `getTime()`
   * vaut `NaN` : un comparateur qui rend `NaN` laisse le tri ne rien
   * réordonner, et n'importe quelle soirée peut sortir en tête.
   */
  it('does not let an unparseable date decide which soirée wins', async () => {
    const store = TestBed.inject(CaisseStore);
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([
        { id: '40', name: 'Sans date', date: null, status: 'scheduled' },
        { id: '41', name: 'Ce soir', date: atHour(0), status: 'scheduled' },
      ]);
    await settle();

    expect(store.todayEvent()?.name).toBe('Ce soir');
  });

  /**
   * La grille d'articles lit `sessionEvent()?.menu`, et rien d'autre ne le
   * remplit : ouvrir sans charger le menu donnait une caisse vide, sans erreur.
   */
  it('loads the menu when the session opens', async () => {
    const store = TestBed.inject(CaisseStore);
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([{ id: '7', name: 'Soirée BBQ', date: atHour(0), status: 'ongoing' }]);
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
  it('ignores past and completed soirées', async () => {
    const store = TestBed.inject(CaisseStore);
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([
        { id: '8', name: 'Gala lointain', date: atHour(400), status: 'scheduled' },
        { id: '9', name: 'Hier', date: atHour(-1), status: 'scheduled' },
        { id: '10', name: 'Clôturée ce soir', date: atHour(0), status: 'completed' },
        { id: '11', name: 'Ce soir', date: atHour(0), status: 'scheduled' },
      ]);
    await settle();

    expect(store.todayEvent()?.name).toBe('Ce soir');
  });
});

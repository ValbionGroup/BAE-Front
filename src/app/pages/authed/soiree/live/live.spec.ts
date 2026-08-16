import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SoireeLive } from './live';
import { OrdersStore } from '#core/store/orders.store';

/** La page charge par promesses nues ; en zoneless, Angular ne les suit pas. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Dates relatives à l'exécution : la règle porte sur le jour courant. */
const atHour = (offsetDays: number, hour = 19) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

describe(SoireeLive.name, () => {
  let component: SoireeLive;
  let fixture: ComponentFixture<SoireeLive>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoireeLive],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(SoireeLive);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**
   * La page annonçait « Soirée Hivernale » écrit en dur dans le gabarit, sans
   * savoir quelle soirée elle affichait.
   */
  it('names the soirée that is open, not a future one', async () => {
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([
        { id: '1', name: 'Gala de fin', date: atHour(400), status: 'scheduled' },
        { id: '2', name: 'Soirée BBQ', date: atHour(0), status: 'ongoing' },
        { id: '3', name: 'Vieille soirée', date: atHour(-30), status: 'completed' },
      ]);
    await settle();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Soirée BBQ');
    expect(text).not.toContain('Vieille soirée');
    expect(text).not.toContain('Gala de fin');
    expect(text).not.toContain('Soirée Hivernale');
  });

  it('says so when there is no event to pilot, rather than inventing one', async () => {
    http.expectOne((r) => r.url.endsWith('/events')).flush([]);
    await settle();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain("Aucune soirée en cours aujourd'hui");
  });

  /** Le bug rapporté : la vue live et la caisse ne doivent jamais désigner une
   *  soirée future, si proche soit-elle. */
  it('does not pilot a soirée scheduled for another day', async () => {
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([{ id: '5', name: 'Demain soir', date: atHour(1), status: 'scheduled' }]);
    await settle();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain("Aucune soirée en cours aujourd'hui");
    expect(text).not.toContain('Demain soir');
  });

  /**
   * La page portait plus de 400 lignes de maquette en données inventées : file
   * de tickets, KPIs d'encaissement, cadence, flux de transactions, alertes et
   * stock critique — aucune ne consommait d'endpoint. Tout a été supprimé.
   *
   * Cette garde existe pour que le décor ne revienne pas : des chiffres faux
   * sur un écran de service sont pires qu'un écran vide, parce qu'on les croit.
   */
  it('shows none of the invented service data', async () => {
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([{ id: '6', name: 'Soirée BBQ', date: atHour(0), status: 'ongoing' }]);
    await settle();
    fixture.detectChanges();
    await settle();

    http.expectOne((r) => r.url.includes('/events/6/products')).flush([]);
    http.expectOne((r) => r.url.includes('/events/6/production-runs')).flush([]);
    await settle();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    // Les colonnes, la cadence, le flux, les marges puis les alertes et le
    // stock ont quitté cette liste au fur et à mesure qu'un endpoint les a
    // alimentés. Ce qui reste n'a toujours aucune source : les noms de clients
    // et les montants de la maquette.
    for (const invented of ['C. Renard', '1 736,50', '4,2 / min']) {
      expect(text).not.toContain(invented);
    }

    // ⚠️ Les alertes sont désormais réelles — donc silencieuses quand il n'y a
    // rien à signaler. Un décor réapparu se trahirait ici.
    expect(text).not.toContain('Alertes');
  });

  it('shows produced against planned once the runs land', async () => {
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([{ id: '4', name: 'Soirée BBQ', date: atHour(0), status: 'ongoing' }]);
    await settle();
    // L'effect qui déclenche les deux chargements ne tourne qu'à la détection
    // de changements — sans ce passage, aucune requête n'est encore partie.
    fixture.detectChanges();
    await settle();

    // Le menu et les lancements partent ensemble depuis le même effect.
    http.expectOne((r) => r.url.includes('/events/4/products')).flush([]);
    http
      .expectOne((r) => r.url.includes('/events/4/production-runs'))
      .flush([
        { productId: 1, productName: 'Hot-dog', plannedQty: 200, producedQty: 120, runs: [] },
      ]);
    await settle();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Hot-dog');
    expect(text).toContain('120 / 200');
  });

  /**
   * Un 403 sur la production ne doit pas vider la page : la lecture exige
   * `stock:read`, que le socle ne porte pas.
   */
  it('shows a restricted panel instead of emptying the page on 403', async () => {
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([{ id: '4', name: 'Soirée BBQ', date: atHour(0), status: 'ongoing' }]);
    await settle();
    fixture.detectChanges();
    await settle();

    http.expectOne((r) => r.url.includes('/events/4/products')).flush([]);
    http
      .expectOne((r) => r.url.includes('/events/4/production-runs'))
      .flush(
        { code: 'E_FORBIDDEN', message: 'Missing permission: stock:read' },
        { status: 403, statusText: 'Forbidden' },
      );
    await settle();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Accès restreint');
    // La page vit toujours.
    expect(text).toContain('Soirée BBQ');
  });

  it('affiche les commandes reelles dans leur colonne et les fait avancer', async () => {
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([{ id: '4', name: 'Soiree BBQ', date: atHour(0), status: 'ongoing' }]);
    await settle();
    fixture.detectChanges();
    await settle();

    http.expectOne((r) => r.url.includes('/events/4/products')).flush([]);
    http.expectOne((r) => r.url.includes('/events/4/production-runs')).flush([]);
    http
      .expectOne((r) => r.url.includes('/events/4/orders'))
      .flush([
        {
          id: 11,
          number: 3,
          eventId: 4,
          status: 'in_progress',
          clientName: 'Camille Renard',
          lines: [{ productId: 1, productName: 'Hot-dog', quantity: 2, unitPrice: 250 }],
          totalCents: 500,
          createdAt: new Date().toISOString(),
        },
      ]);
    http.expectOne((r) => r.url.includes('/events/4/sellable')).flush([]);
    await settle();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Camille Renard');
    expect(text).toContain('Hot-dog');
    // Le montant est en centimes sur le fil, en euros a l ecran.
    expect(text).toContain('5,00');

    // Depuis `in_progress`, le geste suivant est « Marquer prete » (-> ready).
    const store = TestBed.inject(OrdersStore);
    const done = store.advance(11, 'ready');
    const patch = http.expectOne((r) => r.url.includes('/orders/11/status'));
    expect(patch.request.body).toEqual({ status: 'ready' });
    patch.flush({
      id: 11,
      number: 3,
      eventId: 4,
      status: 'ready',
      clientName: 'Camille Renard',
      lines: [{ productId: 1, productName: 'Hot-dog', quantity: 2, unitPrice: 250 }],
      totalCents: 500,
      createdAt: new Date().toISOString(),
    });
    await done;

    expect(store.ready().length).toBe(1);
    expect(store.inProgress().length).toBe(0);
  });

  /**
   * Le contresens que ce test verrouille : la carte déduisait « payée » de
   * l'absence de montant, ce qui ne dit que « ce n'est pas une commande de
   * comptoir ». Une précommande impayée affichait donc « Payée à la commande »
   * juste au-dessus de l'alerte disant l'inverse.
   */
  it('épingle les précommandes dues et ne prétend jamais qu’une impayée est réglée', async () => {
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([{ id: '4', name: 'Soiree BBQ', date: atHour(0), status: 'ongoing' }]);
    await settle();
    fixture.detectChanges();
    await settle();

    http.expectOne((r) => r.url.includes('/events/4/products')).flush([]);
    http.expectOne((r) => r.url.includes('/events/4/production-runs')).flush([]);
    http.expectOne((r) => r.url.includes('/events/4/orders')).flush([]);
    http.expectOne((r) => r.url.includes('/events/4/sellable')).flush([]);
    await settle();

    // Les précommandes partent après la résolution des commandes : elles ne
    // peuvent pas être réclamées avant ce point.
    http
      .expectOne((r) => r.url.includes('/events/4/pre-orders'))
      .flush([
        {
          id: 39,
          reference: 'P1',
          eventId: 4,
          status: 'pending',
          clientName: 'Gerda Mayer',
          lines: [{ productId: 1, productName: 'Hot-dog', quantity: 2, receivedQuantity: 0 }],
          paid: true,
          fullyCollected: false,
          pickupAt: atHour(0, 21),
          due: true,
          createdAt: atHour(-2),
        },
        {
          id: 41,
          reference: 'P3',
          eventId: 4,
          status: 'pending',
          clientName: 'Rick McLaughlin',
          lines: [{ productId: 2, productName: 'Crêpe', quantity: 1, receivedQuantity: 0 }],
          paid: false,
          fullyCollected: false,
          pickupAt: null,
          due: true,
          createdAt: atHour(0, 12),
        },
        {
          id: 40,
          reference: 'P2',
          eventId: 4,
          status: 'pending',
          clientName: 'Conrad Windler',
          lines: [{ productId: 3, productName: 'Frites', quantity: 3, receivedQuantity: 0 }],
          paid: true,
          fullyCollected: false,
          pickupAt: atHour(1),
          due: false,
          createdAt: atHour(-1),
        },
      ]);
    await settle();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Gerda Mayer');
    expect(text).toContain('Payée à la commande');

    // L'impayée est là, signalée, et ne se dit pas réglée.
    expect(text).toContain('Rick McLaughlin');
    expect(text).toContain('Aucun paiement rattaché');
    expect(text.match(/Payée à la commande/g)?.length).toBe(1);

    // Celle qui n'est pas due n'a rien à faire sous les yeux de la cuisine.
    expect(text).not.toContain('Conrad Windler');

    // Sans heure de retrait, on prépare : elle passe devant celle de 21 h.
    const store = TestBed.inject(OrdersStore);
    expect(store.pendingPreOrders().map((t) => t.id)).toEqual([41, 39]);
  });
});

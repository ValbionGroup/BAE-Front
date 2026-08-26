import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { provideMockStore } from '@ngrx/store/testing';

import { SoireeLive } from './live';
import { OrdersStore } from '#core/store/orders.store';
import { ModalService } from '#shared/components/modal/modal.service';
import { WebsocketService } from '#core/services/websocket/websocket-service';
import type { WsMessage } from '#core/models/ws-message.model';
import { Subject } from 'rxjs';
import { STOCK_AUDIT_MS } from '#shared/utils/stock-level';
import { Permission } from '#core/models/permission.model';

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
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        // Le poste de pilotage complet : les tests de ce groupe portent sur
        // l'affichage, pas sur les droits. Ceux-là sont plus bas.
        provideMockStore({
          initialState: {
            auth: {
              permissions: [
                'order:serve',
                'order:write',
                'order:delete',
                'stock:write',
                'event:settle',
              ],
            },
          },
        }),
      ],
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
    expect(text).toContain('Aucune soirée ouverte');
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
    expect(text).toContain('Aucune soirée ouverte');
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

describe(`${SoireeLive.name} — le cycle de vie de la soirée`, () => {
  let component: SoireeLive;
  let fixture: ComponentFixture<SoireeLive>;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SoireeLive],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMockStore({
          initialState: {
            auth: {
              permissions: [
                'order:serve',
                'order:write',
                'stock:write',
                'event:settle',
                'event:write',
              ],
            },
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SoireeLive);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    await fixture.whenStable();
  });

  /** Sert la liste des soirées, puis vide les requêtes de suite. */
  async function withEvents(events: unknown[]): Promise<void> {
    http.expectOne((r) => r.url.endsWith('/events')).flush(events);
    await settle();
    for (const request of http.match(() => true)) request.flush([]);
    await settle();
    fixture.detectChanges();
  }

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  /**
   * ⚠️ **Le défaut rapporté le 2026-08-26.** Une soirée simplement programmée
   * pour aujourd'hui pilotait la page et ouvrait la caisse — « comme si elle
   * était ouverte » — parce que `activeEvent` retombait sur « non clôturée,
   * datée d'aujourd'hui ». Cette règle avait sa raison d'être tant que rien ne
   * pouvait ouvrir une soirée ; elle rendait l'ouverture décorative.
   *
   * Elle n'est proposée à l'ouverture qu'à cet endroit, dans l'état vide.
   */
  it('ne pilote pas une soirée du jour que personne n’a ouverte', async () => {
    await withEvents([{ id: '2', name: 'Soirée BBQ', date: atHour(0), status: 'scheduled' }]);

    expect(text()).toContain('Aucune soirée à piloter');
    expect(text()).not.toContain('LIVE · Soirée en cours');
    expect(text()).not.toContain('Clôturer la soirée');
    // Le chemin d'entrée : elle est offerte à l'ouverture, pas pilotée.
    expect(text()).toContain('Ouvrir');
  });

  it('ouvre la soirée, et le comptoir bascule en service', async () => {
    await withEvents([{ id: '2', name: 'Soirée BBQ', date: atHour(0), status: 'scheduled' }]);

    const opening = component['openNight']('2');
    const request = http.expectOne((r) => r.url.endsWith('/events/2/open'));
    expect(request.request.method).toBe('POST');
    request.flush({ id: 2, name: 'Soirée BBQ', date: atHour(0), status: 'ongoing' });
    await opening;
    for (const pending of http.match(() => true)) pending.flush([]);
    await settle();
    fixture.detectChanges();

    expect(text()).toContain('LIVE · Soirée en cours');
    expect(text()).toContain('Clôturer la soirée');
  });

  /**
   * Le 409 d'unicité — « une autre soirée est déjà ouverte » — porte le nom de
   * la coupable. L'avaler laisserait l'opérateur devant un bouton qui ne fait
   * rien.
   */
  it('montre le refus du serveur plutôt que de l’avaler', async () => {
    await withEvents([{ id: '2', name: 'Soirée BBQ', date: atHour(0), status: 'scheduled' }]);

    const opening = component['openNight']('2');
    http
      .expectOne((r) => r.url.endsWith('/events/2/open'))
      .flush(
        { code: 'E_EVENT_ALREADY_OPEN', message: '« Soirée d’avant » est déjà ouverte.' },
        { status: 409, statusText: 'Conflict' },
      );
    await opening;

    expect(component['openError']()).toContain('déjà ouverte');
  });

  /**
   * **Le passage de minuit.** Une soirée d'hier soir jamais ouverte sort de
   * `activeEvent` à 00 h 00 et emporte la caisse en plein service. L'écran vide
   * doit offrir de l'ouvrir — c'est le seul moyen de la fixer.
   */
  it('propose d’ouvrir une soirée d’hier soir restée planifiée', async () => {
    await withEvents([
      { id: '7', name: 'Soirée d’hier', date: atHour(-1, 22), status: 'scheduled' },
    ]);

    expect(text()).toContain('Aucune soirée à piloter');
    expect(text()).toContain('Soirée d’hier');
    expect(text()).toContain('Ouvrir');
  });

  /** Une soirée de la semaine prochaine ne s'ouvre pas depuis l'écran de service. */
  it('n’offre pas d’ouvrir une soirée à venir', async () => {
    await withEvents([{ id: '8', name: 'Gala de fin', date: atHour(9), status: 'scheduled' }]);

    expect(text()).toContain('Aucune soirée à piloter');
    expect(text()).not.toContain('Gala de fin');
  });

  /**
   * ⚠️ La caisse renvoie ici pour ouvrir la soirée. Si cet écran se contente de
   * dire « une soirée doit être ouverte par le bureau », les deux pages se
   * renvoient l'une à l'autre et l'opérateur tourne en rond. L'état vide doit
   * dire **pourquoi** il est vide.
   */
  it('dit qu’aucune soirée n’est programmée plutôt que de renvoyer ailleurs', async () => {
    await withEvents([{ id: '8', name: 'Gala de fin', date: atHour(9), status: 'scheduled' }]);

    expect(text()).toContain("Aucune soirée n'est programmée aujourd'hui");
  });

  /**
   * ⚠️ L'identifiant doit être capturé **avant** la clôture : une fois la soirée
   * `completed`, `activeEvent` vaut `null`, et un bilan sans cible retombe sur
   * son heuristique — celle qui affichait une soirée de 2027 sans commandes.
   */
  it('emmène au bilan de la soirée qu’elle vient de clôturer', async () => {
    await withEvents([{ id: '2', name: 'Soirée BBQ', date: atHour(0), status: 'ongoing' }]);

    const modal = TestBed.inject(ModalService);
    const openSpy = vi.spyOn(modal, 'open').mockReturnValue('modal-id');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component['closeNight']();

    const config = openSpy.mock.calls[0][0] as unknown as {
      inputs: { eventId: string; onDone: () => void };
    };
    const inputs = config.inputs;
    expect(inputs.eventId).toBe('2');

    inputs.onDone();
    expect(navigate).toHaveBeenCalledWith(['/soiree/bilan', '2']);
  });
});

describe(`${SoireeLive.name} — ce que la cuisine a le droit de faire`, () => {
  /**
   * Rend la page avec une soirée en cours et le jeu de permissions donné.
   * Les requêtes de suite (commandes, production, précommandes) sont vidées en
   * bloc : ce groupe ne teste que les boutons.
   */
  async function render(
    permissions: Permission[],
    events: unknown[] = [{ id: '2', name: 'Soirée BBQ', date: atHour(0), status: 'ongoing' }],
  ): Promise<ComponentFixture<SoireeLive>> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SoireeLive],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMockStore({ initialState: { auth: { permissions } } }),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SoireeLive);
    const http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();

    http.expectOne((r) => r.url.endsWith('/events')).flush(events);
    await settle();
    for (const request of http.match(() => true)) request.flush([]);
    await settle();
    fixture.detectChanges();

    return fixture;
  }

  const text = (fixture: ComponentFixture<SoireeLive>) =>
    (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('un membre de cuisine consulte et fait avancer, sans rien clôturer', async () => {
    const fixture = await render(['order:serve']);

    // Clôturer déclenche un retour en stock (`stock:write`) puis atterrit sur le
    // bilan (`event:settle`) : sans les deux, le bouton est une impasse.
    expect(text(fixture)).not.toContain('Clôturer la soirée');
    // La caisse est une autre route, gardée : proposer le lien la ferait
    // rebondir vers l'accueil.
    expect(text(fixture)).not.toContain('Ouvrir la caisse');
  });

  it('rend la clôture à qui porte à la fois stock:write et event:settle', async () => {
    const fixture = await render(['order:serve', 'stock:write', 'event:settle']);

    expect(text(fixture)).toContain('Clôturer la soirée');
  });

  it('retient la clôture quand il ne manque que event:settle', async () => {
    const fixture = await render(['order:serve', 'stock:write']);

    expect(text(fixture)).not.toContain('Clôturer la soirée');
  });

  it('rend le lien caisse à qui encaisse', async () => {
    const fixture = await render(['order:serve', 'order:write']);

    expect(text(fixture)).toContain('Ouvrir la caisse');
  });

  /**
   * Sans `event:write`, pas de bouton — mais l'écran doit dire que c'est un
   * droit qui manque, et non laisser croire qu'aucune soirée n'existe.
   */
  it('explique l’absence de bouton à qui ne peut pas ouvrir', async () => {
    const fixture = await render(
      ['order:serve'],
      [{ id: '2', name: 'Soirée BBQ', date: atHour(0), status: 'scheduled' }],
    );

    expect(text(fixture)).toContain('Aucune soirée à piloter');
    expect(text(fixture)).toContain("droit d'écriture sur les soirées");
    // La soirée n'est pas proposée : c'est son nom, et non le mot « ouvrir »,
    // qui signale la ligne — la phrase d'explication le contient elle-même.
    expect(text(fixture)).not.toContain('Soirée BBQ');
  });
});

/** Un fil temps réel qu'un test peut alimenter. */
class FakeRealtime {
  readonly bus = new Subject<WsMessage>();
  readonly messages$ = this.bus.asObservable();
  subscribeToEvent(): Promise<void> {
    return Promise.resolve();
  }
  unsubscribeFromEvent(): Promise<void> {
    return Promise.resolve();
  }
}

function order(id: number) {
  return {
    id,
    number: id,
    status: 'pending',
    clientName: 'Anonyme',
    totalCents: 250,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lines: [{ productId: 1, productName: 'Hot-dog', quantity: 1, unitPrice: 250 }],
  } as never;
}

describe(`${SoireeLive.name} — le stock suit les ventes sans rechargement`, () => {
  let fixture: ComponentFixture<SoireeLive>;
  let http: HttpTestingController;
  let realtime: FakeRealtime;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    realtime = new FakeRealtime();
    await TestBed.configureTestingModule({
      imports: [SoireeLive],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WebsocketService, useValue: realtime },
        provideMockStore({
          initialState: { auth: { permissions: ['order:serve', 'order:write', 'stock:write'] } },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SoireeLive);
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();

    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([{ id: '2', name: 'Soirée BBQ', date: atHour(0), status: 'ongoing' }]);
    await settle();
    // ⚠️ Vider **deux fois**, de part et d'autre de la détection de changement :
    // le chargement de la soirée part d'un `effect`, qui ne tourne qu'à ce
    // moment-là. Sans la seconde vidange, la requête `/sellable` d'ouverture
    // reste en vol et se compte comme une relecture temps réel.
    for (const request of http.match(() => true)) request.flush([]);
    await settle();
    fixture.detectChanges();
    await settle();
    for (const request of http.match(() => true)) request.flush([]);
    await settle();
  });

  const sellableRequests = () => http.match((r) => r.url.includes('/events/2/sellable'));

  /**
   * ⚠️ **Le défaut rapporté.** Les ventes arrivaient bien en cuisine — la file
   * de tickets se remplissait — mais `sellable` n'était relu qu'au chargement de
   * la page et après un lancement de production. « Il reste 12 » ne bougeait
   * donc jamais, et la rupture n'apparaissait qu'après un F5.
   */
  it('relit le stock quand une vente arrive sur le fil', async () => {
    realtime.bus.next({ type: 'order.created', payload: order(1) });
    await new Promise((resolve) => setTimeout(resolve, STOCK_AUDIT_MS + 120));

    expect(sellableRequests().length).toBe(1);
  });

  /** Une annulation rend la marchandise : elle compte autant qu'une vente. */
  it('relit le stock quand une commande est annulée', async () => {
    realtime.bus.next({ type: 'order.cancelled', payload: order(2) });
    await new Promise((resolve) => setTimeout(resolve, STOCK_AUDIT_MS + 120));

    expect(sellableRequests().length).toBe(1);
  });

  /** Un passage en cuisine ne déplace rien de vendable : pas de requête. */
  it('ne relit rien pour un simple changement de statut en cuisine', async () => {
    realtime.bus.next({ type: 'order.updated', payload: order(3) });
    await new Promise((resolve) => setTimeout(resolve, STOCK_AUDIT_MS + 120));

    expect(sellableRequests().length).toBe(0);
  });

  /**
   * ⚠️ **Ce que `debounceTime` aurait cassé.** Un flux soutenu repousse sans
   * cesse l'échéance d'un `debounce`, qui n'émettrait donc jamais — au coup de
   * feu, précisément. `auditTime` relit une fois par fenêtre entamée.
   */
  it('relit malgré un flux continu de ventes, là où un debounce ne relirait jamais', async () => {
    const stop = Date.now() + STOCK_AUDIT_MS * 2;
    while (Date.now() < stop) {
      realtime.bus.next({ type: 'order.created', payload: order(Date.now()) });
      await new Promise((resolve) => setTimeout(resolve, STOCK_AUDIT_MS / 4));
    }
    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(sellableRequests().length).toBeGreaterThanOrEqual(1);
  });

  /** Une rafale ne déclenche pas une requête par vente. */
  it('regroupe une rafale en une seule relecture', async () => {
    for (let i = 0; i < 8; i++) realtime.bus.next({ type: 'order.created', payload: order(i) });
    await new Promise((resolve) => setTimeout(resolve, STOCK_AUDIT_MS + 120));

    expect(sellableRequests().length).toBe(1);
  });
});

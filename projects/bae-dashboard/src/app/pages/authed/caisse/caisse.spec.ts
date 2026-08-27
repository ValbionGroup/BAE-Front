import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Caisse } from './caisse';
import { CaisseStore } from '#core/store/caisse.store';
import { EventsStore } from '#core/store/events.store';
import { ModalService } from '#shared/components/modal/modal.service';
import { WebsocketService } from '#core/services/websocket/websocket-service';
import type { WsMessage } from '#core/models/ws-message.model';
import { STOCK_AUDIT_MS } from '#shared/utils/stock-level';
import { Subject } from 'rxjs';

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
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        // La page lit les permissions pour décider si la remise est offerte.
        provideMockStore({ initialState: { auth: { permissions: ['order:write'] } } }),
      ],
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

  /** Ouvre une session avec un article au panier. */
  async function withCart() {
    const store = TestBed.inject(CaisseStore);
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([{ id: '7', name: 'Ce soir', date: atHour(0), status: 'ongoing' }]);
    await settle();
    // L'ouverture est portée par un `effect` : il faut une détection de
    // changement pour qu'il parte.
    fixture.detectChanges();
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
    // Ouvrir une session charge aussi le vendable : sans lui, la grille ne
    // saurait pas ce qui est en rupture.
    http.expectOne((r) => r.method === 'GET' && r.url.includes('/events/7/orders')).flush([]);
    http.expectOne((r) => r.url.includes('/events/7/sellable')).flush([]);
    await settle();
    http.expectOne((r) => r.url.includes('/events/7/pre-orders')).flush([]);
    await settle();

    store.addToCart(store.menu()[0]);
    return store;
  }

  describe('remise', () => {
    /** Le comptoir n'a pas à voir un geste qu'il ne peut pas faire : le bouton
     *  est absent, pas grisé. */
    it('n’offre pas la remise sans le droit order:discount', () => {
      expect(component['canDiscount']()).toBe(false);
    });

    it('offre la remise avec le droit', () => {
      TestBed.inject(MockStore).setState({
        auth: { permissions: ['order:write', 'order:discount'] },
      });

      expect(component['canDiscount']()).toBe(true);
    });

    const discountButton = (): HTMLButtonElement | null =>
      fixture.nativeElement.querySelector('button[aria-label="Ajouter une remise"]');

    /**
     * Le défaut visé : le geste n'existait que dans le pied `hidden md:block`,
     * donc nulle part sous `md` — c'est-à-dire sur la vue que le comptoir
     * utilise réellement. L'en-tête du ticket n'a pas de point de rupture.
     */
    it('pose la remise dans l’en-tête du ticket, sans classe de rupture', async () => {
      TestBed.inject(MockStore).setState({
        auth: { permissions: ['order:write', 'order:discount'] },
      });
      await withCart();
      fixture.detectChanges();

      const button = discountButton();
      expect(button).not.toBeNull();
      // Ni dans le pied `hidden md:block` d'où il vient, ni dans un bloc
      // `md:hidden` qui le rendrait invisible au poste fixe.
      expect(button?.closest('.md\\:block')).toBeNull();
      expect(button?.closest('.md\\:hidden')).toBeNull();
    });

    /** Le droit absent retire le bouton, il ne le grise pas. */
    it('n’affiche aucun bouton de remise sans le droit', async () => {
      await withCart();
      fixture.detectChanges();

      expect(discountButton()).toBeNull();
    });

    /** Un panier vide n'a rien à remiser : le bouton reste là, mais inerte. */
    it('désactive la remise tant que le panier est vide', async () => {
      TestBed.inject(MockStore).setState({
        auth: { permissions: ['order:write', 'order:discount'] },
      });
      await withCart();
      TestBed.inject(CaisseStore).clearCart();
      fixture.detectChanges();

      expect(discountButton()?.disabled).toBe(true);
    });

    /**
     * Sous `md` le détail des totaux est masqué : sans une ligne dédiée, une
     * remise posée ne se lirait nulle part, seul « À encaisser » bougerait — et
     * un montant qui baisse sans motif ressemble à une erreur de caisse.
     */
    it('montre la remise appliquée dans le pied mobile', async () => {
      TestBed.inject(MockStore).setState({
        auth: { permissions: ['order:write', 'order:discount'] },
      });
      const store = await withCart();
      store.setDiscount({ label: 'Geste commercial', amountCents: 100 });
      fixture.detectChanges();

      const line = [...fixture.nativeElement.querySelectorAll('.md\\:hidden')].find(
        (node: Element) => node.textContent?.includes('Geste commercial'),
      );
      expect(line).toBeDefined();
      expect(line?.textContent).toContain('1,00');
    });
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
  it('ouvre la caisse d’elle-même sur la soirée en cours', async () => {
    const store = TestBed.inject(CaisseStore);
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([{ id: '7', name: 'Soirée BBQ', date: atHour(0), status: 'ongoing' }]);
    await settle();
    fixture.detectChanges();

    expect(store.sessionActive()).toBe(true);
    expect(store.sessionEvent()?.name).toBe('Soirée BBQ');
    // L'écran d'ouverture n'existe plus : demander de « lancer la session »
    // alors que la soirée tourne déjà était une formalité vide.
    expect(fixture.nativeElement.textContent as string).not.toContain('Lancer la session');
  });

  /**
   * Une soirée clôturée sort d'`activeEvent` : la caisse doit se refermer seule,
   * sinon elle continue d'encaisser sur une soirée que le bilan a déjà arrêtée.
   */
  it('referme la caisse quand la soirée passe clôturée', async () => {
    const store = TestBed.inject(CaisseStore);
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([{ id: '7', name: 'Soirée BBQ', date: atHour(0), status: 'ongoing' }]);
    await settle();
    fixture.detectChanges();
    expect(store.sessionActive()).toBe(true);

    void TestBed.inject(EventsStore).refresh();
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([{ id: '7', name: 'Soirée BBQ', date: atHour(0), status: 'completed' }]);
    await settle();
    fixture.detectChanges();

    expect(store.sessionActive()).toBe(false);
  });

  /**
   * Le chemin réel de la clôture, celui qui manquait : `closeEvent` patche
   * `status` **sur place** après la réponse du serveur. Sans ce patch il aurait
   * fallu recharger la page pour que la caisse se ferme — et le comptoir a
   * continué d'encaisser sur une soirée clôturée pendant tout ce temps.
   */
  it('referme la caisse dès que la clôture aboutit, sans rechargement', async () => {
    const store = TestBed.inject(CaisseStore);
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([{ id: '7', name: 'Soirée BBQ', date: atHour(0), status: 'ongoing' }]);
    await settle();
    fixture.detectChanges();
    expect(store.sessionActive()).toBe(true);

    const closing = TestBed.inject(EventsStore).closeEvent('7');
    http
      .expectOne((r) => r.url.endsWith('/events/7/settle'))
      .flush({ settled: 0, alreadySettled: 0, totalDelta: 0, status: 'completed' });
    await closing;
    fixture.detectChanges();

    expect(store.sessionActive()).toBe(false);
  });

  /**
   * ⚠️ `startSession` ne remettait à zéro ni l'acheteur ni la catégorie de prise
   * en charge. Inoffensif tant que l'ouverture était manuelle et unique ; avec
   * une ouverture automatique qui peut enchaîner deux soirées, la remise du BDE
   * de la veille s'appliquerait à la soirée du soir.
   */
  it('n’hérite ni de l’acheteur ni de la catégorie de la soirée précédente', async () => {
    const store = TestBed.inject(CaisseStore);
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([{ id: '7', name: 'Soirée BBQ', date: atHour(0), status: 'ongoing' }]);
    await settle();
    fixture.detectChanges();

    store.setBuyer({ id: 1, name: 'Léa', email: 'lea@enseirb.fr', fastPass: null } as never);
    store.startSession('8');

    expect(store.selectedBuyer()).toBeNull();
    expect(store.category()).toBeNull();
  });

  it('says the till cannot open when no soirée is running', async () => {
    http.expectOne((r) => r.url.endsWith('/events')).flush([]);
    await settle();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain("Aucune soirée n'est ouverte");
    expect(text).not.toContain('Lancer la session');
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
    expect(fixture.nativeElement.textContent as string).toContain("Aucune soirée n'est ouverte");
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
   * réordonner, et n'importe quelle soirée peut sortir en tête. Le départage ne
   * porte plus que sur des soirées **ouvertes**, mais il porte toujours.
   */
  it('does not let an unparseable date decide which soirée wins', async () => {
    const store = TestBed.inject(CaisseStore);
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([
        { id: '40', name: 'Sans date', date: null, status: 'ongoing' },
        { id: '41', name: 'Ce soir', date: atHour(0), status: 'ongoing' },
      ]);
    await settle();

    expect(store.todayEvent()?.name).toBe('Ce soir');
  });

  /**
   * ⚠️ **Le défaut rapporté le 2026-08-26.** Une soirée simplement programmée
   * pour aujourd'hui ouvrait la caisse toute seule, à minuit, sans que personne
   * ne l'ait lancée — « la caisse est active avec la prochaine soirée comme si
   * elle était ouverte ». La règle de repli « non clôturée, datée
   * d'aujourd'hui » avait sa raison d'être tant que rien ne pouvait ouvrir une
   * soirée ; depuis `POST /events/:id/open`, elle rend l'ouverture décorative.
   */
  it('n’ouvre pas la caisse sur une soirée du jour que personne n’a lancée', async () => {
    const store = TestBed.inject(CaisseStore);
    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([{ id: '50', name: 'Prévue ce soir', date: atHour(0), status: 'scheduled' }]);
    await settle();
    fixture.detectChanges();

    expect(store.todayEvent()).toBeNull();
    expect(store.sessionActive()).toBe(false);
    expect(fixture.nativeElement.textContent as string).not.toContain('Prévue ce soir');
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
    // ⚠️ L'ouverture passe par un `effect` : sans détection de changement, il ne
    // tourne pas et aucune requête de session ne part.
    fixture.detectChanges();
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
        { id: '11', name: 'Ce soir', date: atHour(0), status: 'ongoing' },
      ]);
    await settle();

    expect(store.todayEvent()?.name).toBe('Ce soir');
  });

  describe('encaissement', () => {
    /** Le QR d'une catégorie ne désigne personne : il ne porte qu'une grille. */
    const staffCategory = (overrides: Record<string, unknown> = {}) => ({
      id: 3,
      eventId: 7,
      label: 'Staff BDE',
      payerName: 'BDE',
      prices: [{ productId: 1, priceCents: 100 }],
      ...overrides,
    });

    it('retarife les lignes déjà au panier quand une catégorie est appliquée', async () => {
      const store = await withCart();
      store.incrementItem(1);
      expect(store.chargedTotal()).toBe(500);

      // Appliquée APRÈS la composition du panier : c'est le cas qui casserait si
      // le prix était figé à l'ajout.
      store.applyCategory(staffCategory() as never);

      expect(store.chargedTotal()).toBe(200);
      expect(store.publicTotal()).toBe(500);
      expect(store.receivableTotal()).toBe(300);
    });

    it('restaure les prix publics quand la catégorie est retirée', async () => {
      const store = await withCart();
      store.applyCategory(staffCategory() as never);
      store.clearCategory();

      expect(store.chargedTotal()).toBe(250);
      expect(store.receivableTotal()).toBe(0);
    });

    it('laisse au prix public un article absent de la grille', async () => {
      const store = await withCart();
      store.applyCategory(staffCategory({ prices: [] }) as never);

      expect(store.chargedTotal()).toBe(250);
      expect(store.receivableTotal()).toBe(0);
    });

    it('refuse une catégorie appartenant à une autre soirée, et le montre en grand', async () => {
      const store = await withCart();
      const applied = store.applyCategory(staffCategory({ eventId: 99 }) as never);

      expect(applied).toBe(false);
      expect(store.category()).toBeNull();
      expect(store.chargedTotal()).toBe(250);
      // Le bandeau plein écran, pas un toast : en rush il doit sauter aux yeux.
      expect(store.checkoutError()).toBe('Ce QR appartient à une autre soirée.');
      // …mais rien n'a été encaissé, donc le titre ne doit pas le prétendre.
      expect(store.errorTitle()).toBe('QR refusé');
    });

    it('accepte un identifiant de soirée numérique, comme l’API le renvoie', async () => {
      const store = await withCart();
      // ⚠️ `EventApiDto.id` est un nombre — c'est ce que sert l'API — et rien ne
      // garantit que l'appelant l'ait normalisé : la session peut donc porter un
      // nombre. Comparer les chaînes refusait tout QR valide.
      store.startSession(7 as never);
      http.expectOne((r) => r.url.includes('/events/7/products')).flush([]);
      http.expectOne((r) => r.method === 'GET' && r.url.includes('/events/7/orders')).flush([]);
      http.expectOne((r) => r.url.includes('/events/7/sellable')).flush([]);
      await settle();
      http.match((r) => r.url.includes('/pre-orders')).forEach((r) => r.flush([]));

      expect(store.applyCategory(staffCategory({ eventId: 7 }) as never)).toBe(true);
    });

    it('transmet la catégorie à l’encaissement, sans aucun prix', async () => {
      const store = await withCart();
      store.applyCategory(staffCategory() as never);

      const done = component['checkout']('cash');
      const request = http.expectOne(
        (r) => r.method === 'POST' && r.url.includes('/events/7/orders'),
      );

      expect(request.request.body.sponsorshipCategoryId).toBe(3);
      expect(request.request.body.lines[0].price).toBeUndefined();

      request.flush({
        id: 43,
        number: 1,
        eventId: 7,
        status: 'pending',
        clientName: 'Anonyme',
        lines: [],
        discounts: [],
        sponsorship: null,
        grossCents: 500,
        discountCents: 0,
        sponsoredCents: 300,
        totalCents: 200,
        createdAt: null,
        updatedAt: null,
      });
      await done;
      await settle();

      // Le QR est rescanné à chaque commande : la suivante repart au tarif public.
      expect(store.category()).toBeNull();
    });

    it('encaisse directement une commande à 0 €, sans demander le moyen de paiement', async () => {
      const store = await withCart();
      const modals = TestBed.inject(ModalService);
      const open = vi.spyOn(modals, 'open');

      // Prise en charge intégrale : rien n'entre en caisse, donc « espèces ou
      // Lydia ? » n'arbitre rien.
      store.applyCategory(staffCategory({ prices: [{ productId: 1, priceCents: 0 }] }) as never);
      expect(store.chargedTotal()).toBe(0);

      component['openPayment']();

      expect(open).not.toHaveBeenCalled();
      const request = http.expectOne(
        (r) => r.method === 'POST' && r.url.includes('/events/7/orders'),
      );
      expect(request.request.body.paymentMethod).toBe('cash');
      request.flush({
        id: 44,
        number: 1,
        eventId: 7,
        status: 'pending',
        clientName: 'Anonyme',
        lines: [],
        discounts: [],
        sponsorship: null,
        grossCents: 250,
        discountCents: 0,
        sponsoredCents: 250,
        totalCents: 0,
        createdAt: null,
        updatedAt: null,
      });
      await settle();
    });

    it('demande le moyen de paiement dès qu’il y a quelque chose à encaisser', async () => {
      const store = await withCart();
      const modals = TestBed.inject(ModalService);
      const open = vi.spyOn(modals, 'open').mockReturnValue('modal-id');

      expect(store.chargedTotal()).toBe(250);
      component['openPayment']();

      expect(open).toHaveBeenCalled();
      http.expectNone((r) => r.method === 'POST' && r.url.includes('/events/7/orders'));
    });

    it('affiche le total en euros, pas en centimes', async () => {
      const store = await withCart();
      store.incrementItem(1);

      // 2 x 250 centimes = 5,00 EUR, et surtout pas 500,00.
      expect(component['formatCents'](store.chargedTotal())).toBe('5,00');
    });

    it('vide le panier une fois la commande enregistree', async () => {
      const store = await withCart();

      const done = component['checkout']('cash');
      http
        .expectOne((r) => r.method === 'POST' && r.url.includes('/events/7/orders'))
        .flush({
          id: 42,
          number: 1,
          eventId: 7,
          status: 'pending',
          clientName: 'Anonyme',
          lines: [{ productId: 1, productName: 'Hot-dog', quantity: 1, unitPrice: 250 }],
          totalCents: 250,
          createdAt: new Date().toISOString(),
        });
      await done;

      expect(store.itemCount()).toBe(0);
    });

    /**
     * Le panier etait vide inconditionnellement : une coupure reseau faisait
     * perdre la commande sans rien dire.
     */
    it('preserve le panier quand le serveur refuse', async () => {
      const store = await withCart();

      const done = component['checkout']('cash');
      http
        .expectOne((r) => r.method === 'POST' && r.url.includes('/events/7/orders'))
        .flush(
          { code: 'E_PRODUCT_NOT_ON_MENU', message: 'Hors menu.' },
          { status: 422, statusText: 'Unprocessable Entity' },
        );
      await done;

      expect(store.itemCount()).toBe(1);
      expect(store.checkoutError()).toBe('Hors menu.');
    });

    it('annonce le numero de commande apres encaissement', async () => {
      const store = await withCart();

      const done = component['checkout']('cash');
      http
        .expectOne((r) => r.method === 'POST' && r.url.includes('/events/7/orders'))
        .flush({
          id: 42,
          number: 7,
          eventId: 7,
          status: 'pending',
          clientName: 'Anonyme',
          lines: [{ productId: 1, productName: 'Hot-dog', quantity: 1, unitPrice: 250 }],
          totalCents: 250,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      await done;
      fixture.detectChanges();

      // Le numero est ce que le caissier annonce au client — il doit etre a
      // l ecran, pas seulement dans un toast fugace.
      expect(store.lastOrder()?.number).toBe(7);
      expect(fixture.nativeElement.textContent).toContain('n°7');
    });

    it('affiche le refus sans vider le panier', async () => {
      const store = await withCart();

      const done = component['checkout']('cash');
      http
        .expectOne((r) => r.method === 'POST' && r.url.includes('/events/7/orders'))
        .flush(
          { code: 'E_PRODUCT_NOT_ON_MENU', message: 'Hors menu.' },
          { status: 422, statusText: 'Unprocessable Entity' },
        );
      await done;
      fixture.detectChanges();

      expect(store.itemCount()).toBe(1);
      expect(fixture.nativeElement.textContent).toContain('Encaissement refusé');
    });
  });

  describe('raccourcis clavier', () => {
    /** Ouvre une session avec deux articles au menu et un au panier. */
    async function withSession() {
      const store = TestBed.inject(CaisseStore);
      http
        .expectOne((r) => r.url.endsWith('/events'))
        .flush([{ id: '7', name: 'Ce soir', date: atHour(0), status: 'ongoing' }]);
      await settle();

      store.startSession('7');
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
          {
            productId: 2,
            name: 'Biere',
            isVegetarian: true,
            quantity: 100,
            price: 300,
            unitCost: null,
            totalCost: null,
            category: 'Boisson',
          },
        ]);
      http.expectOne((r) => r.method === 'GET' && r.url.includes('/events/7/orders')).flush([]);
      http.expectOne((r) => r.url.includes('/events/7/sellable')).flush([]);
      await settle();
      http.expectOne((r) => r.url.includes('/events/7/pre-orders')).flush([]);
      await settle();
      return store;
    }

    const press = (key: string, target?: HTMLElement) => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      (target ?? document.body).dispatchEvent(event);
      return event;
    };

    it('F1 fait defiler les categories et revient a Tous', async () => {
      const store = await withSession();
      expect(store.activeCategory()).toBeNull();

      press('F1');
      expect(store.activeCategory()).toBe('Chaud');
      press('F1');
      expect(store.activeCategory()).toBe('Boisson');
      press('F1');
      expect(store.activeCategory()).toBeNull();
    });

    it('+ et - ajustent la ligne active', async () => {
      const store = await withSession();
      store.addToCart(store.menu()[0]);

      press('+');
      expect(store.cart()[0].quantity).toBe(2);
      press('-');
      expect(store.cart()[0].quantity).toBe(1);
      press('-');
      expect(store.itemCount()).toBe(0);
    });

    it('+ vise le dernier article ajoute, pas le premier', async () => {
      const store = await withSession();
      store.addToCart(store.menu()[0]);
      store.addToCart(store.menu()[1]);

      press('+');
      expect(store.cart()[0].quantity).toBe(1);
      expect(store.cart()[1].quantity).toBe(2);
    });

    it('Entree encaisse', async () => {
      const store = await withSession();
      store.addToCart(store.menu()[0]);

      press('Enter');
      // Le choix du moyen de paiement precede l'encaissement : c'est la modale
      // qui s'ouvre, pas la requete.
      expect(TestBed.inject(ModalService).modals().length).toBe(1);
      http.expectNone((r) => r.method === 'POST');
    });

    /**
     * Les raccourcis ecoutent `document` : sans ces gardes, taper « + » dans la
     * recherche d'acheteur ajouterait un article au ticket.
     */
    it('se tait pendant une saisie', async () => {
      const store = await withSession();
      store.addToCart(store.menu()[0]);

      const input = document.createElement('input');
      document.body.appendChild(input);
      press('+', input);
      expect(store.cart()[0].quantity).toBe(1);
      input.remove();
    });

    it('se tait quand une modale est ouverte', async () => {
      const store = await withSession();
      store.addToCart(store.menu()[0]);
      TestBed.inject(ModalService).open({ type: 'info', title: 'x', message: 'y' });

      press('+');
      expect(store.cart()[0].quantity).toBe(1);
    });

    it('laisse Entree au bouton deja cible', async () => {
      const store = await withSession();
      store.addToCart(store.menu()[0]);

      const button = document.createElement('button');
      document.body.appendChild(button);
      press('Enter', button);
      expect(TestBed.inject(ModalService).modals().length).toBe(0);
      button.remove();
    });

    it('ne fait rien sans session ouverte', () => {
      const store = TestBed.inject(CaisseStore);
      http.expectOne((r) => r.url.endsWith('/events')).flush([]);

      const event = press('F1');
      expect(event.defaultPrevented).toBe(false);
      expect(store.activeCategory()).toBeNull();
    });
  });
});

/**
 * La caisse ne relisait le stock qu'après **ses propres** encaissements. Deux
 * comptoirs sur la même soirée se croyaient donc chacun seul : `canAdd`
 * autorisait de vendre un article que l'autre venait d'épuiser, jusqu'au
 * rechargement de la page.
 */
describe(`${Caisse.name} — le stock suit les ventes des autres postes`, () => {
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

  let fixture: ComponentFixture<Caisse>;
  let http: HttpTestingController;
  let realtime: FakeRealtime;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    realtime = new FakeRealtime();
    await TestBed.configureTestingModule({
      imports: [Caisse],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMockStore({ initialState: { auth: { permissions: ['order:write'] } } }),
        { provide: WebsocketService, useValue: realtime },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Caisse);
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();

    http
      .expectOne((r) => r.url.endsWith('/events'))
      .flush([{ id: '7', name: 'Soirée BBQ', date: atHour(0), status: 'ongoing' }]);
    await settle();
    fixture.detectChanges();
    await settle();
    // La session s'ouvre par un `effect` : vider ce qu'elle déclenche, sinon la
    // `/sellable` d'ouverture se compte comme une relecture temps réel.
    for (const request of http.match(() => true)) request.flush([]);
    await settle();
  });

  afterEach(() => {
    TestBed.inject(CaisseStore).endSession();
  });

  it('relit le stock quand un autre poste encaisse', async () => {
    realtime.bus.next({
      type: 'order.created',
      payload: { id: 99, lines: [] } as never,
    });
    await new Promise((resolve) => setTimeout(resolve, STOCK_AUDIT_MS + 120));

    expect(http.match((r) => r.url.includes('/events/7/sellable')).length).toBe(1);
  });
});

import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';
import { MenuItem, Presence } from '#core/models/event.model';

import { EventsStore } from './events.store';

const LOCK_ERROR = {
  code: 'E_PRESENCE_LOCKED_BY_ASSIGNMENT',
  message:
    'Vous tenez un poste sur cette soirée : vous ne pouvez plus vous déclarer absent·e. ' +
    'Demandez au bureau ou au coordinateur de vous retirer de votre poste.',
};

function menuLine(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    productId: 3,
    name: 'Hot-dog classique',
    isVegetarian: false,
    quantity: 100,
    price: 350,
    unitCost: 1.12,
    totalCost: 112,
    category: 'Plats',
    ...overrides,
  };
}

describe(EventsStore.name, () => {
  let store: InstanceType<typeof EventsStore>;
  let httpMock: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(EventsStore);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  async function loadOneEvent(): Promise<void> {
    const loaded = store.load();
    httpMock.expectOne(`${baseUrl}/events`).flush([
      {
        id: '7',
        name: 'Soirée test',
        location: 'Foyer',
        date: new Date().toISOString(),
      },
    ]);
    await loaded;
  }

  /**
   * Place le menu de la soirée '7' dans le store en repassant par le réseau,
   * comme `loadOneEvent()` : le store n'expose aucune autre façon de le
   * peupler que `loadEventMenu()`, donc c'est elle qui sert de semis plutôt
   * qu'un `patchState` direct depuis le test.
   */
  async function seedMenu(eventId: string, menu: MenuItem[]): Promise<void> {
    await loadOneEvent();
    const pending = store.loadEventMenu(eventId);
    httpMock.expectOne(`${baseUrl}/events/${eventId}/products`).flush(menu);
    await pending;
  }

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  describe('setMemberPresence', () => {
    it('reports success and stores the new presence', async () => {
      await loadOneEvent();

      const pending = store.setMemberPresence('7', Presence.PRESENT);
      httpMock.expectOne(`${baseUrl}/events/7/response`).flush(Presence.PRESENT);
      const result = await pending;

      expect(result.ok).toBe(true);
      expect(store.getEventById('7')?.memberPresence).toBe(Presence.PRESENT);
      expect(store.getEventById('7')?.memberPresenceStatus).toBe('loaded');
    });

    /**
     * The whole point of the change: a 409 carries the only sentence that tells
     * the member what to do next. Swallowing the rejection left every caller
     * with nothing but a status flag, so the lock could never be explained.
     */
    it('hands the rejected error back to the caller', async () => {
      await loadOneEvent();

      const pending = store.setMemberPresence('7', Presence.ABSENT);
      httpMock
        .expectOne(`${baseUrl}/events/7/response`)
        .flush(LOCK_ERROR, { status: 409, statusText: 'Conflict' });
      const result = await pending;

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected a failure');
      expect(result.error).toBeInstanceOf(HttpErrorResponse);
      expect((result.error as HttpErrorResponse).error).toEqual(LOCK_ERROR);
    });

    it('still marks the event as errored and leaves the presence untouched', async () => {
      await loadOneEvent();

      const pending = store.setMemberPresence('7', Presence.ABSENT);
      httpMock
        .expectOne(`${baseUrl}/events/7/response`)
        .flush(LOCK_ERROR, { status: 409, statusText: 'Conflict' });
      await pending;

      expect(store.getEventById('7')?.memberPresenceStatus).toBe('error');
      expect(store.getEventById('7')?.memberPresence).toBeUndefined();
    });

    /**
     * A fire-and-forget caller (`home.ts` calls this without awaiting) must not
     * produce an unhandled rejection: the failure travels in the resolved value,
     * never as a rejected promise.
     */
    it('never rejects', async () => {
      await loadOneEvent();

      const pending = store.setMemberPresence('7', Presence.ABSENT);
      httpMock
        .expectOne(`${baseUrl}/events/7/response`)
        .flush(LOCK_ERROR, { status: 409, statusText: 'Conflict' });

      await expect(pending).resolves.toBeDefined();
    });

    /** The write is what succeeded; there is simply no cached row to patch. */
    it('still reports success for an event the store never loaded', async () => {
      const pending = store.setMemberPresence('404', Presence.PRESENT);
      httpMock.expectOne(`${baseUrl}/events/404/response`).flush(Presence.PRESENT);

      expect((await pending).ok).toBe(true);
    });
  });

  describe('menu', () => {
    it('charge le menu d’une soirée', async () => {
      await loadOneEvent();

      const promise = store.loadEventMenu('7');
      httpMock.expectOne(`${baseUrl}/events/7/products`).flush([
        {
          productId: 3,
          name: 'Hot-dog classique',
          isVegetarian: false,
          quantity: 220,
          price: 350,
          unitCost: 1.12,
          totalCost: 246.4,
          category: 'Plats',
        },
      ]);
      await promise;

      expect(store.getEventById('7')?.menu).toHaveLength(1);
      expect(store.getEventById('7')?.menuStatus).toBe('loaded');
    });

    it('met à jour la quantité de façon optimiste et confirme avec la réponse', async () => {
      await seedMenu('7', [menuLine({ productId: 3, quantity: 100, totalCost: 112 })]);

      const promise = store.setMenuLineQuantity('7', 3, 240);
      // Optimiste : la valeur a déjà bougé, avant toute réponse réseau.
      expect(store.getEventById('7')?.menu?.[0].quantity).toBe(240);

      httpMock
        .expectOne({ method: 'PATCH', url: `${baseUrl}/events/7/products/3` })
        .flush(menuLine({ productId: 3, quantity: 240, totalCost: 268.8 }));
      await promise;

      // Le coût total ne peut pas être deviné côté client : il vient du serveur.
      expect(store.getEventById('7')?.menu?.[0].totalCost).toBe(268.8);
    });

    it('ne restaure que la ligne fautive quand l’écriture échoue', async () => {
      await seedMenu('7', [
        menuLine({ productId: 3, quantity: 100 }),
        menuLine({ productId: 4, quantity: 50 }),
      ]);

      const promise = store.setMenuLineQuantity('7', 3, 240);
      httpMock
        .expectOne({ method: 'PATCH', url: `${baseUrl}/events/7/products/3` })
        .flush({ message: 'Refusé' }, { status: 403, statusText: 'Forbidden' });
      await promise;

      // Ligne 3 revenue à 100, ligne 4 intacte : un instantané global annulerait
      // aussi une écriture concurrente aboutie pendant que celle-ci était en vol.
      expect(store.getEventById('7')?.menu?.[0].quantity).toBe(100);
      expect(store.getEventById('7')?.menu?.[1].quantity).toBe(50);
      expect(store.menuError()).toBeTruthy();
    });

    it('retire une ligne du menu', async () => {
      await seedMenu('7', [menuLine({ productId: 3 }), menuLine({ productId: 4 })]);

      const promise = store.removeMenuLine('7', 3);
      httpMock.expectOne({ method: 'DELETE', url: `${baseUrl}/events/7/products/3` }).flush(null);
      await promise;

      expect(store.getEventById('7')?.menu?.map((line) => line.productId)).toEqual([4]);
    });

    /**
     * `removeMenuLine` ne doit pas capturer `menu` avant l'attente réseau : une
     * écriture concurrente aboutie sur une autre ligne pendant que la
     * suppression est en vol doit survivre, pas disparaître sous une copie
     * filtrée d'un état déjà périmé.
     */
    it('conserve une écriture concurrente aboutie pendant qu’une suppression est en vol', async () => {
      await seedMenu('7', [
        menuLine({ productId: 3, quantity: 100 }),
        menuLine({ productId: 4, quantity: 50 }),
      ]);

      const removePromise = store.removeMenuLine('7', 3);
      const deleteReq = httpMock.expectOne({
        method: 'DELETE',
        url: `${baseUrl}/events/7/products/3`,
      });

      // Pendant que la suppression de la ligne 3 est en vol, une autre écriture
      // aboutit sur la ligne 4.
      const quantityPromise = store.setMenuLineQuantity('7', 4, 999);
      httpMock
        .expectOne({ method: 'PATCH', url: `${baseUrl}/events/7/products/4` })
        .flush(menuLine({ productId: 4, quantity: 999 }));
      await quantityPromise;

      deleteReq.flush(null);
      await removePromise;

      const menu = store.getEventById('7')?.menu ?? [];
      expect(menu.map((line) => line.productId)).toEqual([4]);
      expect(menu[0].quantity).toBe(999);
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import { Presence } from '#core/models/event.model';

import { EventsStore } from './events.store';

const LOCK_ERROR = {
  code: 'E_PRESENCE_LOCKED_BY_ASSIGNMENT',
  message:
    'Vous tenez un poste sur cette soirée : vous ne pouvez plus vous déclarer absent·e. ' +
    'Demandez au bureau ou au coordinateur de vous retirer de votre poste.',
};

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
});

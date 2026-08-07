import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { EventsService } from '#core/services/events/events-service';
import { EventDetail, Presence, RosterRow } from '#core/models/event.model';
import { lastValueFrom } from 'rxjs';
import { LoadingStatus } from '#core/models/global.model';

/**
 * Outcome of a presence write, handed back to the caller.
 *
 * A plain `void` used to hide the only thing a member needs when the write is
 * refused: `POST /events/:id/response` answers 409
 * `E_PRESENCE_LOCKED_BY_ASSIGNMENT` with a full French sentence explaining that
 * a poste is held and how to get out of it. The store swallowed it, so no
 * screen could ever say why the refusal happened.
 *
 * The failure travels in the RESOLVED value rather than as a rejection on
 * purpose: `home.ts` calls `setMemberPresence` fire-and-forget, and a rejected
 * promise nobody awaits is an unhandled rejection. Every existing caller keeps
 * compiling and behaving exactly as before; those that care read `ok`.
 */
export type PresenceUpdateResult = { ok: true } | { ok: false; error: unknown };

interface EventsState {
  readonly loading: LoadingStatus;
  readonly events: Record<string, EventDetail>;
}

const initialState: EventsState = {
  events: {},
  loading: 'init',
};

function toEventsDict(eventsList: readonly EventDetail[]): Record<string, EventDetail> {
  return eventsList.reduce(
    (acc, ev) => {
      acc[ev.id] = {
        ...ev,
        memberPresenceStatus: 'init',
        menuStatus: 'init',
        rosterStatus: 'init',
      };
      return acc;
    },
    {} as Record<string, EventDetail>,
  );
}

export const EventsStore = signalStore(
  { providedIn: 'root' },
  withState<EventsState>(initialState),
  withComputed(({ events }) => ({
    allEvents: computed(() => Object.values(events())),
  })),
  withMethods((store, eventService = inject(EventsService)) => ({
    getEventById(id: string): EventDetail | undefined {
      return store.events()[id];
    },

    async load() {
      if (store.loading() === 'loaded' || store.loading() === 'loading') return;
      patchState(store, { loading: 'loading' });
      try {
        const eventsList = await lastValueFrom(eventService.fetchAll());
        patchState(store, { events: toEventsDict(eventsList), loading: 'loaded' });
      } catch (error) {
        patchState(store, { loading: 'error' });
      }
    },

    async refresh() {
      patchState(store, { loading: 'refreshing' });
      try {
        const eventsList = await lastValueFrom(eventService.fetchAll());
        patchState(store, { events: toEventsDict(eventsList), loading: 'loaded' });
      } catch (error) {
        patchState(store, { loading: 'error' });
      }
    },

    async loadEventRoster(eventId: string) {
      const currentEvent = store.events()[eventId];
      if (!currentEvent) return;

      const currentStatus = currentEvent.rosterStatus;
      if (currentStatus === 'loading' || currentStatus === 'refreshing') {
        return;
      }

      patchState(store, (state) => ({
        events: {
          ...state.events,
          [eventId]: { ...currentEvent, rosterStatus: 'refreshing' } as EventDetail,
        },
      }));

      try {
        const roster = (await lastValueFrom(
          eventService.fetchRosterForEvent(eventId),
        )) as unknown as RosterRow[];
        patchState(store, (state) => ({
          events: {
            ...state.events,
            [eventId]: {
              ...state.events[eventId],
              roster,
              rosterStatus: 'loaded',
            } as EventDetail,
          },
        }));
      } catch (error) {
        patchState(store, (state) => ({
          events: {
            ...state.events,
            [eventId]: { ...state.events[eventId], rosterStatus: 'error' } as EventDetail,
          },
        }));
      }
    },

    async loadMemberPresence(eventId: string) {
      const currentEvent = store.events()[eventId];
      if (!currentEvent) return;

      const currentStatus = currentEvent.memberPresenceStatus;
      if (currentStatus === 'loading' || currentStatus === 'refreshing') {
        return;
      }

      patchState(store, (state) => ({
        events: {
          ...state.events,
          [eventId]: {
            ...state.events[eventId],
            memberPresenceStatus: 'refreshing',
          } as EventDetail,
        },
      }));

      try {
        const presence = (await lastValueFrom(
          eventService.fetchPresenceForEvent(eventId),
        )) as unknown as Presence;
        patchState(store, (state) => ({
          events: {
            ...state.events,
            [eventId]: {
              ...state.events[eventId],
              memberPresence: presence,
              memberPresenceStatus: 'loaded',
            } as EventDetail,
          },
        }));
      } catch (error) {
        patchState(store, (state) => ({
          events: {
            ...state.events,
            [eventId]: { ...state.events[eventId], memberPresenceStatus: 'error' } as EventDetail,
          },
        }));
      }
    },

    async setMemberPresence(
      eventId: string,
      memberPresence: Presence,
    ): Promise<PresenceUpdateResult> {
      try {
        await lastValueFrom(eventService.updatePresenceForEvent(eventId, memberPresence));

        const current = store.events()[eventId];
        // Nothing cached to patch — the write itself still went through.
        if (!current) return { ok: true };
        patchState(store, (state) => ({
          events: {
            ...state.events,
            [eventId]: {
              ...state.events[eventId],
              memberPresence,
              memberPresenceStatus: 'loaded',
            } as EventDetail,
          },
        }));
        return { ok: true };
      } catch (error) {
        patchState(store, (state) => ({
          events: {
            ...state.events,
            [eventId]: { ...state.events[eventId], memberPresenceStatus: 'error' } as EventDetail,
          },
        }));
        return { ok: false, error };
      }
    },

    clear(): void {
      patchState(store, { loading: 'init', events: {} });
    },
  })),
);

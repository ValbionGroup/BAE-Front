import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { EventsService } from '#core/services/events/events-service';
import { EventDetail, Presence, RosterRow } from '#core/models/event.model';
import { lastValueFrom } from 'rxjs';
import { LoadingStatus } from '#core/models/global.model';

interface EventsState {
  readonly loading: LoadingStatus;
  readonly events: Record<string, EventDetail>;
}

const initialState: EventsState = {
  events: {},
  loading: 'init',
};

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
      patchState(store, { loading: 'loading' });
      try {
        const eventsList = await lastValueFrom(eventService.fetchAll());

        const eventsDict = eventsList.reduce(
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

        patchState(store, { events: eventsDict, loading: 'loaded' });
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
          [eventId]: { ...state.events[eventId], memberPresenceStatus: 'refreshing' } as EventDetail,
        },
      }));

      try {
        const presence = await lastValueFrom(
          eventService.fetchPresenceForEvent(eventId),
        ) as unknown as Presence;
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

    async setMemberPresence(eventId: string, memberPresence: Presence) {
      try {
        await lastValueFrom(eventService.updatePresenceForEvent(eventId, memberPresence));

        const current = store.events()[eventId];
        if (!current) return;
        patchState(store, (state) => ({
          events: {
            ...state.events,
            [eventId]: { ...state.events[eventId], memberPresence, memberPresenceStatus: "loaded" } as EventDetail,
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

    clear(): void {
      patchState(store, { loading: 'init', events: {} });
    },
  })),
  withHooks({ onInit: (s) => s.load() }),
);

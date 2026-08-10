import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { EventsService } from '#core/services/events/events-service';
import { EventDetail, MenuItem, Presence, RosterRow } from '#core/models/event.model';
import { LogistiqueService } from '#core/services/logistique/logistique-service';
import { lastValueFrom } from 'rxjs';
import { LoadingStatus } from '#core/models/global.model';
import { messageOf } from '#shared/utils/api-error';

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
  /**
   * Erreur de la dernière écriture de menu. Une seule suffit : l'écran ne
   * montre qu'un message à la fois, et les écritures sont sérialisées par le
   * verrou `savingMenuKeys`.
   */
  readonly menuError: string | null;
  /** Verrou par ligne, clé `"<eventId>:<productId>"`. */
  readonly savingMenuKeys: readonly string[];
}

const initialState: EventsState = {
  events: {},
  loading: 'init',
  menuError: null,
  savingMenuKeys: [],
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
  withMethods((store, eventService = inject(EventsService), menu = inject(LogistiqueService)) => {
    /** Remplace le menu d'une soirée sans toucher au reste du dictionnaire. */
    function patchMenu(eventId: string, lines: readonly MenuItem[]): void {
      const current = store.events()[eventId];
      if (!current) return;
      patchState(store, {
        events: { ...store.events(), [eventId]: { ...current, menu: [...lines] } },
      });
    }

    return {
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

      async loadEventMenu(eventId: string): Promise<void> {
        const current = store.events()[eventId];
        if (!current) return;
        patchState(store, {
          events: { ...store.events(), [eventId]: { ...current, menuStatus: 'loading' } },
        });
        try {
          const lines = await lastValueFrom(menu.getEventMenu(eventId));
          const after = store.events()[eventId];
          patchState(store, {
            events: {
              ...store.events(),
              [eventId]: { ...after, menu: lines, menuStatus: 'loaded' },
            },
          });
        } catch {
          const after = store.events()[eventId];
          patchState(store, {
            events: { ...store.events(), [eventId]: { ...after, menuStatus: 'error' } },
          });
        }
      },

      /**
       * Non optimiste : il n'y a ni coût dérivé ni prix de vente avant la
       * réponse, et les inventer afficherait deux fois des chiffres différents.
       */
      async addMenuLine(eventId: string, productId: number, quantity = 10): Promise<void> {
        patchState(store, { menuError: null });
        try {
          const line = await lastValueFrom(menu.addMenuLine(eventId, productId, quantity));
          const current = store.events()[eventId];
          patchMenu(eventId, [...(current?.menu ?? []), line]);
        } catch (error) {
          patchState(store, {
            menuError: messageOf(error, "Impossible d'ajouter cette recette au menu."),
          });
        }
      },

      /**
       * Optimiste : la quantité doit suivre le clic, pas le réseau.
       *
       * En cas de refus, seule la ligne fautive est restaurée, fusionnée dans
       * l'état vivant — un instantané global annulerait aussi une écriture
       * concurrente aboutie pendant que celle-ci était en vol.
       */
      async setMenuLineQuantity(
        eventId: string,
        productId: number,
        quantity: number,
      ): Promise<void> {
        const key = `${eventId}:${productId}`;
        if (store.savingMenuKeys().includes(key)) return;

        const lines = store.events()[eventId]?.menu ?? [];
        const previous = lines.find((line) => line.productId === productId);
        if (!previous) return;

        patchState(store, { menuError: null, savingMenuKeys: [...store.savingMenuKeys(), key] });
        patchMenu(
          eventId,
          lines.map((line) => (line.productId === productId ? { ...line, quantity } : line)),
        );

        try {
          const saved = await lastValueFrom(menu.setMenuLineQuantity(eventId, productId, quantity));
          patchMenu(
            eventId,
            (store.events()[eventId]?.menu ?? []).map((line) =>
              line.productId === productId ? saved : line,
            ),
          );
        } catch (error) {
          patchMenu(
            eventId,
            (store.events()[eventId]?.menu ?? []).map((line) =>
              line.productId === productId ? previous : line,
            ),
          );
          patchState(store, {
            menuError: messageOf(error, 'Impossible de modifier cette quantité.'),
          });
        } finally {
          patchState(store, {
            savingMenuKeys: store.savingMenuKeys().filter((entry) => entry !== key),
          });
        }
      },

      async removeMenuLine(eventId: string, productId: number): Promise<void> {
        patchState(store, { menuError: null });
        try {
          await lastValueFrom(menu.removeMenuLine(eventId, productId));
          // Relu après l'attente, jamais capturé avant : une écriture concurrente
          // aboutie pendant ce vol doit survivre à la suppression, pas disparaître
          // sous une copie filtrée d'un état périmé.
          patchMenu(
            eventId,
            (store.events()[eventId]?.menu ?? []).filter((line) => line.productId !== productId),
          );
        } catch (error) {
          patchState(store, {
            menuError: messageOf(error, 'Impossible de retirer cette recette.'),
          });
        }
      },
    };
  }),
);

import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import {
  CoordinationService,
  type ApiAssignment,
  type ApiEvent,
  type ApiEventJob,
  type EventPatch,
} from '#core/services/coordination/coordination-service';
import type { LoadingStatus } from '#core/models/global.model';
import type {
  CoordinationEvent,
  EventStatus,
} from '#pages/authed/coordination/events/events.types';

function toCoordinationEvent(
  apiEvent: ApiEvent,
  assignments: ApiAssignment[],
  eventJobs: ApiEventJob[],
): CoordinationEvent {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dt = new Date(apiEvent.date);
  /**
   * Une soirée close est passée quelle que soit sa date : `events.status`
   * bascule à `completed` à la clôture, et la ranger dans « À venir » parce que
   * son plan de postes est incomplet la ferait revenir indéfiniment.
   */
  const isCompleted = apiEvent.status === 'completed';
  const isPast = isCompleted || dt < today;

  const assignedCount = new Set(
    assignments.filter((a) => a.eventId === apiEvent.id).map((a) => a.memberId),
  ).size;
  const maxMembers = eventJobs
    .filter((ej) => ej.eventId === apiEvent.id)
    .reduce((sum, ej) => sum + ej.count, 0);

  const status: EventStatus = isPast ? 'past' : 'preparing';

  return {
    id: apiEvent.id,
    name: apiEvent.name,
    date: dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
    rawDate: apiEvent.date,
    status,
    statusLabel: isCompleted ? 'Achevée' : isPast ? 'Passée' : 'En préparation',
    statusKind: isPast ? 'ok' : 'warn',
    members: assignedCount,
    maxMembers,
    recipes: 0,
    duration: apiEvent.duration,
    description: apiEvent.description ?? null,
    capacity: apiEvent.capacity ?? 0,
    expectedAttendees: apiEvent.expectedAttendees ?? null,
    payerName: apiEvent.payerName ?? null,
    preOrderCloseLeadHours: apiEvent.preOrderCloseLeadHours ?? null,
  };
}

interface CoordinationState {
  loading: LoadingStatus;
  loadError: string | null;
  events: CoordinationEvent[];
  assignments: ApiAssignment[];
  eventJobs: ApiEventJob[];
}

const initialState: CoordinationState = {
  loading: 'init',
  loadError: null,
  events: [],
  assignments: [],
  eventJobs: [],
};

export const CoordinationStore = signalStore(
  { providedIn: 'root' },
  withState<CoordinationState>(initialState),
  withMethods((store, svc = inject(CoordinationService)) => {
    async function fetchInto(status: 'loading' | 'refreshing'): Promise<void> {
      patchState(store, { loading: status, loadError: null });
      try {
        const raw = await lastValueFrom(svc.loadAll());
        const events = raw.events
          .map((e) => toCoordinationEvent(e, raw.assignments, raw.eventJobs))
          .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
        patchState(store, {
          loading: 'loaded',
          events,
          assignments: raw.assignments,
          eventJobs: raw.eventJobs,
        });
      } catch {
        patchState(store, { loading: 'error', loadError: 'Impossible de charger les soirées.' });
      }
    }

    return {
      async load(): Promise<void> {
        if (store.loading() === 'loaded' || store.loading() === 'loading') return;
        await fetchInto('loading');
      },

      /**
       * Re-fetch, bypassing the `load()` cache guard. Needed after a mutation
       * performed OUTSIDE the store invalidated what it holds — the
       * coordination detail page talks to `CoordinationService` directly, so
       * running the matching engine there silently desyncs the cached event
       * list (assigned counts) of this root-provided singleton.
       *
       * No-op while nothing has been loaded yet: an untouched store has no
       * stale data to fix, and `load()` will do the initial fetch.
       */
      async refresh(): Promise<void> {
        if (store.loading() === 'init' || store.loading() === 'loading') return;
        await fetchInto('refreshing');
      },

      async createEvent(name: string, date: string, duration: number | null): Promise<ApiEvent> {
        const ev = await lastValueFrom(svc.createEvent(name, date, duration));
        const newEvent = toCoordinationEvent(ev, store.assignments(), store.eventJobs());
        patchState(store, {
          events: [...store.events(), newEvent].sort(
            (a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime(),
          ),
        });
        return ev;
      },

      async updateEvent(id: number, patch: EventPatch): Promise<ApiEvent> {
        const ev = await lastValueFrom(svc.updateEvent(id, patch));
        const updated = toCoordinationEvent(ev, store.assignments(), store.eventJobs());
        patchState(store, {
          events: store.events().map((e) => (e.id === id ? updated : e)),
        });
        return ev;
      },

      async deleteEvent(id: number): Promise<void> {
        await lastValueFrom(svc.deleteEvent(id));
        patchState(store, {
          events: store.events().filter((e) => e.id !== id),
        });
      },
    };
  }),
);

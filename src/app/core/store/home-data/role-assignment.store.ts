import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Store } from '@ngrx/store';
import { lastValueFrom } from 'rxjs';
import { startOfDay } from 'date-fns';
import {
  LucideBeer,
  LucideBriefcase,
  LucideChefHat,
  LucideShieldCheck,
  LucideSparkles,
  LucideWallet,
  type LucideIconInput,
} from '@lucide/angular';
import {
  CoordinationService,
  type ApiAssignment,
  type ApiEventJob,
  type ApiJob,
  type ApiMember,
  type ApiPreference,
} from '#core/services/coordination/coordination-service';
import { EventsStore } from '#core/store/events.store';
import { selectMember } from '#core/store/auth/auth.selector';
import type { LoadingStatus } from '#core/models/global.model';
import { RoleAssignment, RoleMeta } from './models';

/**
 * "Votre rôle ce soir-là" panel.
 *
 * Source: `GET /v1/assignments` + `GET /v1/jobs` + `GET /v1/event-jobs`
 * (+ `/v1/members` for teammate names and `/v1/preferences` for the preferred
 * job), all fetched in one `CoordinationService.loadAll()` round-trip.
 *
 * Known over-fetch: `loadAll()` also pulls `/events` and `/responses`. Adding
 * narrower methods would mean editing `coordination-service.ts`, which is owned
 * by another workstream this phase.
 *
 * ⚠️ `RoleAssignment.algoScore` implies an assignment-scoring algorithm. None
 * exists — no endpoint returns a score, and there is no historical
 * assignment-quality data to compute one from. It is pinned to `0` and the
 * template renders a "score indisponible" placeholder instead of a number.
 *
 * ⚠️ The mockup meta rows (horaire de poste, zone, binôme) have no backing
 * columns either; the three rows below are the ones that do.
 */

/** Presentation-only: picks an icon from the job name. Purely cosmetic. */
const ICON_BY_KEYWORD: readonly (readonly [string, LucideIconInput])[] = [
  ['caisse', LucideWallet],
  ['bar', LucideBeer],
  ['cuisine', LucideChefHat],
  ['securit', LucideShieldCheck],
  ['sécurit', LucideShieldCheck],
  ['menage', LucideSparkles],
  ['ménage', LucideSparkles],
];

function iconFor(jobName: string): LucideIconInput {
  const needle = jobName.toLowerCase();
  return ICON_BY_KEYWORD.find(([keyword]) => needle.includes(keyword))?.[1] ?? LucideBriefcase;
}

function shortName(member: ApiMember): string {
  const last = member.lastName ? ` ${member.lastName.charAt(0)}.` : '';
  return `${member.firstName}${last}`;
}

interface RoleAssignmentState {
  readonly status: LoadingStatus;
  readonly error: string | null;
  readonly assignments: readonly ApiAssignment[];
  readonly jobs: readonly ApiJob[];
  readonly eventJobs: readonly ApiEventJob[];
  readonly members: readonly ApiMember[];
  readonly preferences: readonly ApiPreference[];
}

const initialState: RoleAssignmentState = {
  status: 'init',
  error: null,
  assignments: [],
  jobs: [],
  eventJobs: [],
  members: [],
  preferences: [],
};

export const RoleAssignmentStore = signalStore(
  { providedIn: 'root' },
  withState<RoleAssignmentState>(initialState),
  withComputed((store) => {
    const events = inject(EventsStore);
    const member = inject(Store).selectSignal(selectMember);

    /** Same "next upcoming event" rule as NextEventStore / AgendaStore. */
    const nextEvent = computed(() => {
      const today = startOfDay(new Date()).getTime();
      return [...events.allEvents()]
        .filter((e) => e.date.getTime() >= today)
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
    });

    return {
      loading: computed<boolean>(() => {
        const status = store.status();
        const eventsStatus = events.loading();
        return (
          status === 'init' ||
          status === 'loading' ||
          eventsStatus === 'init' ||
          eventsStatus === 'loading'
        );
      }),

      data: computed<RoleAssignment | null>(() => {
        const memberId = member()?.id;
        const event = nextEvent();
        if (memberId === undefined || !event) return null;

        const eventId = Number(event.id);
        const mine = store
          .assignments()
          .find((a) => a.memberId === memberId && a.eventId === eventId);
        if (!mine) return null;

        const job = store.jobs().find((j) => j.id === mine.jobId);
        const poste = job?.name ?? `Poste #${mine.jobId}`;

        const onSameJob = store
          .assignments()
          .filter((a) => a.eventId === eventId && a.jobId === mine.jobId);
        const needed =
          store.eventJobs().find((ej) => ej.eventId === eventId && ej.jobId === mine.jobId)
            ?.count ?? null;

        const teammates = onSameJob
          .filter((a) => a.memberId !== memberId)
          .map((a) => store.members().find((m) => m.id === a.memberId))
          .filter((m): m is ApiMember => m !== undefined)
          .map(shortName);

        const meta: RoleMeta[] = [
          { label: 'Soirée', value: event.name },
          {
            label: 'Effectif du poste',
            value: needed === null ? String(onSameJob.length) : `${onSameJob.length}/${needed}`,
          },
          { label: 'Coéquipiers', value: teammates.length > 0 ? teammates.join(', ') : 'Aucun' },
        ];

        // No scoring algorithm exists server-side — see the file header.
        return { poste, icon: iconFor(poste), meta, algoScore: 0 };
      }),

      /**
       * Job the member ranked first in `/v1/preferences`. Null when they never
       * expressed a preference — the hero then renders "—" rather than a guess.
       */
      preferredPoste: computed<string | null>(() => {
        const memberId = member()?.id;
        if (memberId === undefined) return null;
        const best = store
          .preferences()
          .filter((p) => p.memberId === memberId)
          .sort((a, b) => a.preferenceRank - b.preferenceRank)[0];
        if (!best) return null;
        return store.jobs().find((j) => j.id === best.jobId)?.name ?? null;
      }),
    };
  }),
  withMethods((store, svc = inject(CoordinationService)) => ({
    async load(): Promise<void> {
      if (store.status() === 'loaded' || store.status() === 'loading') return;
      patchState(store, { status: 'loading', error: null });
      try {
        const raw = await lastValueFrom(svc.loadAll());
        patchState(store, {
          status: 'loaded',
          assignments: raw.assignments,
          jobs: raw.jobs,
          eventJobs: raw.eventJobs,
          members: raw.members,
          preferences: raw.preferences,
        });
      } catch {
        patchState(store, { status: 'error', error: 'Impossible de charger votre affectation.' });
      }
    },

    clear(): void {
      patchState(store, initialState);
    },
  })),
);

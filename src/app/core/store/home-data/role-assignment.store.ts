import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods } from '@ngrx/signals';
import { Store } from '@ngrx/store';
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
import type { ApiMember } from '#core/services/coordination/coordination-service';
import { EventsStore } from '#core/store/events.store';
import { MemberAssignmentsStore } from '#core/store/member-assignments.store';
import { selectMember } from '#core/store/auth/auth.selector';
import { RoleAssignment, RoleMeta } from './models';

/**
 * "Votre rôle ce soir-là" panel.
 *
 * Presentation only: the coordination payload it reads is owned by
 * `MemberAssignmentsStore`, which performs the single
 * `CoordinationService.loadAll()` round-trip. This store used to hold that
 * payload itself, for every soirée, while exposing only the next one — so "mes
 * présences" would have had to either import a `home-data/` store or open a
 * second loading path. The state moved out; the panel stayed here.
 *
 * The mockup showed an invented "algo score /100". What the API really knows is
 * which of the member's OWN choices this poste was — `member_job_preferences`
 * carries the ranking — plus the points the assignment credited
 * (`member_event_assigned_jobs.points_delta`). Both are exposed instead of a
 * fabricated score.
 *
 * ⚠️ The mockup meta rows (horaire de poste, zone, binôme) have no backing
 * columns; the rows below are the ones that do.
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

export const RoleAssignmentStore = signalStore(
  { providedIn: 'root' },
  withComputed(() => {
    const store = inject(MemberAssignmentsStore);
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
        const eventsStatus = events.loading();
        return store.loading() || eventsStatus === 'init' || eventsStatus === 'loading';
      }),

      /**
       * Every assignment row of the payload, all members and all soirées —
       * forwarded because `home.ts` counts the next soirée's assignees from it.
       * Only that one raw slice is re-exported; everything else this panel needs
       * is already shaped by the computed below.
       */
      assignments: computed(() => store.assignments()),

      /** Kept worded for this panel: the page it feeds talks about "votre
       *  affectation", not about the whole coordination payload. */
      error: computed<string | null>(() =>
        store.error() === null ? null : 'Impossible de charger votre affectation.',
      ),

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

        // Which of the member's own choices this poste was. Absent from their
        // ranking means the engine placed them there as a last resort.
        const preferenceRank =
          store.preferences().find((p) => p.memberId === memberId && p.jobId === mine.jobId)
            ?.preferenceRank ?? null;

        const meta: RoleMeta[] = [
          { label: 'Soirée', value: event.name },
          {
            label: 'Effectif du poste',
            value: needed === null ? String(onSameJob.length) : `${onSameJob.length}/${needed}`,
          },
          { label: 'Coéquipiers', value: teammates.length > 0 ? teammates.join(', ') : 'Aucun' },
          {
            label: 'Points de cette affectation',
            value: mine.pointsDelta > 0 ? `+${mine.pointsDelta}` : String(mine.pointsDelta),
          },
        ];

        return { poste, icon: iconFor(poste), meta, preferenceRank };
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
  withMethods(() => {
    const store = inject(MemberAssignmentsStore);
    return {
      load: (): Promise<void> => store.load(),
      clear: (): void => store.clear(),
    };
  }),
);

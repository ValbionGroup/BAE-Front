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
import { formatPointsDelta } from '#shared/utils/points-delta';
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

      /** Kept worded for this panel: the page it feeds talks about "votre
       *  affectation", not about the whole coordination payload. */
      error: computed<string | null>(() =>
        store.error() === null ? null : 'Impossible de charger votre affectation.',
      ),

      /**
       * Every poste the member holds on the next soirée, one per period held
       * (D1), ordered before → during → after — `MemberAssignmentsStore`
       * already sorts them that way. Each carries its OWN rank and its OWN
       * delta: there is no longer a single "the" assignment to find.
       */
      data: computed<readonly RoleAssignment[]>(() => {
        const memberId = member()?.id;
        const event = nextEvent();
        if (memberId === undefined || !event) return [];

        const eventId = Number(event.id);
        const mine = store.assignmentsFor(eventId);

        return mine.map((assignment): RoleAssignment => {
          const onSameJob = store
            .assignments()
            .filter((a) => a.eventId === eventId && a.jobId === assignment.jobId);
          const needed =
            store.eventJobs().find((ej) => ej.eventId === eventId && ej.jobId === assignment.jobId)
              ?.count ?? null;

          const teammates = onSameJob
            .filter((a) => a.memberId !== memberId)
            .map((a) => store.members().find((m) => m.id === a.memberId))
            .filter((m): m is ApiMember => m !== undefined)
            .map(shortName);

          // Which of the member's own choices this poste was. Absent from
          // their ranking means the engine placed them there as a last resort.
          const preferenceRank =
            store.preferences().find((p) => p.memberId === memberId && p.jobId === assignment.jobId)
              ?.preferenceRank ?? null;

          // D5: a good rank COSTS priority credit — this is often negative,
          // and that is normal. Never hide it behind a `·` or a conditional.
          const meta: RoleMeta[] = [
            { label: 'Soirée', value: event.name },
            {
              label: 'Effectif du poste',
              value: needed === null ? String(onSameJob.length) : `${onSameJob.length}/${needed}`,
            },
            { label: 'Coéquipiers', value: teammates.length > 0 ? teammates.join(', ') : 'Aucun' },
            {
              label: 'Crédit de priorité',
              value: formatPointsDelta(assignment.pointsDelta),
            },
          ];

          return {
            poste: assignment.jobName,
            icon: iconFor(assignment.jobName),
            period: assignment.period,
            periodLabel: assignment.periodLabel,
            meta,
            preferenceRank,
          };
        });
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

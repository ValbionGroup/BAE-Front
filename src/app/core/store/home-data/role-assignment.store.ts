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
import type { ApiTeammate } from '#core/services/coordination/coordination-service';
import { EventsStore } from '#core/store/events.store';
import { MemberAssignmentsStore } from '#core/store/member-assignments.store';
import { selectMember } from '#core/store/auth/auth.selector';
import { formatPointsDelta } from '#shared/utils/points-delta';
import { RoleAssignment, RoleMeta } from './models';

/**
 * "Votre rôle ce soir-là" panel.
 *
 * Presentation only: the payload it reads is owned by `MemberAssignmentsStore`.
 * This store used to hold that payload itself, for every soirée, while exposing
 * only the next one — so "mes présences" would have had to either import a
 * `home-data/` store or open a second loading path. The state moved out; the
 * panel stayed here.
 *
 * L'effectif du poste et les coéquipiers arrivent désormais résolus par le back
 * (`GET /v1/account/assignments`) : ce panneau les reconstituait à partir de
 * `/assignments`, `/event-jobs` et `/members`, dont deux exigent `job:read` —
 * une permission qu'un membre ordinaire n'a pas.
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

function shortName(teammate: ApiTeammate): string {
  const last = teammate.lastName ? ` ${teammate.lastName.charAt(0)}.` : '';
  return `${teammate.firstName}${last}`;
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
          const needed = assignment.needed;
          const teammates = assignment.teammates.map(shortName);
          // Moi comprise : le back ne renvoie que les autres.
          const onPoste = teammates.length + 1;

          // Which of the member's own choices this poste was. Absent from
          // their ranking means the engine placed them there as a last resort.
          const preferenceRank =
            store.preferences().find((p) => p.jobId === assignment.jobId)?.preferenceRank ?? null;

          // D5: a good rank COSTS priority credit — this is often negative,
          // and that is normal. Never hide it behind a `·` or a conditional.
          const meta: RoleMeta[] = [
            { label: 'Soirée', value: event.name },
            {
              label: 'Effectif du poste',
              value: needed === null ? String(onPoste) : `${onPoste}/${needed}`,
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
       * Job the member ranked first in `/v1/account/preferences`. Null when they
       * never expressed a preference — the hero then renders "—" rather than a
       * guess.
       *
       * Plus besoin de résoudre l'identifiant contre le catalogue des postes :
       * la route personnelle porte déjà le nom.
       */
      preferredPoste: computed<string | null>(() => {
        const best = [...store.preferences()].sort(
          (a, b) => a.preferenceRank - b.preferenceRank,
        )[0];
        return best?.name ?? null;
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

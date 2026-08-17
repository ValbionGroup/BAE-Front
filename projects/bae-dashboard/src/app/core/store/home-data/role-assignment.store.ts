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

const ICON_BY_KEYWORD: readonly (readonly [string, LucideIconInput])[] = [
  ['caisse', LucideWallet],
  ['service', LucideBeer],
  ['assemblage', LucideChefHat],
  ['barbecue', LucideChefHat],
  ['installation', LucideShieldCheck],
  ['vaisselle', LucideSparkles],
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

      error: computed<string | null>(() =>
        store.error() === null ? null : 'Impossible de charger votre affectation.',
      ),

      data: computed<readonly RoleAssignment[]>(() => {
        const memberId = member()?.id;
        const event = nextEvent();
        if (memberId === undefined || !event) return [];

        const eventId = Number(event.id);
        const mine = store.assignmentsFor(eventId);

        return mine.map((assignment): RoleAssignment => {
          const needed = assignment.needed;
          const teammates = assignment.teammates.map(shortName);
          const onPoste = teammates.length + 1;

          const preferenceRank =
            store.preferences().find((p) => p.jobId === assignment.jobId)?.preferenceRank ?? null;

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

import { computed, inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type { LoadingStatus } from '#core/models/global.model';
import { ActivityService, type ApiActivityEvent } from '#core/services/activity/activity-service';
import { ActivityItem } from './models';

/**
 * Panneau « Activité de l'équipe ».
 *
 * ⚠️ Ce fil est un journal **métier** — « Léa a lancé la production de Hot-dog » —
 * et non le journal HTTP de `GET /v1/logs`, qui produirait « lespiet a créé
 * /v1/events » : l'apparence d'un fil d'activité sans en être un.
 *
 * Sa source est `GET /v1/activity`, qui ne rend que les faits **portant un
 * auteur**. Les rappels automatiques vivent dans la même table côté serveur mais
 * en sont exclus : « le système a rappelé la présence » n'est pas de l'activité
 * d'équipe, et les afficher noierait les vraies actions.
 */
interface ActivityFeedState {
  readonly status: LoadingStatus;
  readonly error: string | null;
  readonly data: readonly ActivityItem[];
}

const initialState: ActivityFeedState = { status: 'init', error: null, data: [] };

/**
 * Le libellé vit dans le `payload` du fait, écrit par l'émetteur : c'est lui qui
 * sait ce qu'il a fait. Le repli couvre un verbe dont personne n'a encore décidé
 * la formulation — mieux vaut une phrase générique qu'une ligne vide.
 */
function toItem(event: ApiActivityEvent): ActivityItem {
  const payload = event.payload;
  const text = (key: string): string | undefined => {
    const value = payload[key];
    return typeof value === 'string' && value !== '' ? value : undefined;
  };

  return {
    who: event.actorName ?? 'Compte supprimé',
    what: text('what') ?? 'a effectué une action',
    emphasis: text('emphasis'),
    tail: text('tail'),
    when: formatWhen(event.occurredAt),
  };
}

function formatWhen(iso: string | null): string {
  if (iso === null) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 60 * 24) return `il y a ${Math.floor(minutes / 60)} h`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export const ActivityFeedStore = signalStore(
  { providedIn: 'root' },
  withState<ActivityFeedState>(initialState),
  withComputed((store) => ({
    loading: computed<boolean>(() => store.status() === 'loading'),
    /** Distingue « rien ne s'est passé » d'une erreur : les deux se disent autrement. */
    unavailable: computed<boolean>(() => store.status() === 'loaded' && store.data().length === 0),
  })),
  withMethods((store, service = inject(ActivityService)) => ({
    async load(): Promise<void> {
      if (store.status() === 'loading') return;
      patchState(store, { status: 'loading', error: null });
      try {
        const events = await lastValueFrom(service.list());
        patchState(store, { status: 'loaded', data: events.map(toItem) });
      } catch {
        patchState(store, {
          status: 'error',
          error: "Impossible de charger l'activité.",
          data: [],
        });
      }
    },

    clear(): void {
      patchState(store, initialState);
    },
  })),
);

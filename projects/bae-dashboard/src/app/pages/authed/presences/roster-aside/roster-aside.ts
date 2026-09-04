import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { LucideBell } from '@lucide/angular';
import { Btn, Badge, BadgeKind, Avatar, ToastService, messageOf } from '@bae/ui';
import { Presence, RosterRow } from '#core/models/event.model';
import { EventsStore } from '#core/store/events.store';

@Component({
  selector: 'bfd-presences-roster-aside',
  imports: [Btn, Badge, Avatar],
  templateUrl: './roster-aside.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'complementary',
    // La bordure et le fond du panneau appartiennent désormais à `bae-detail-sheet`,
    // qui l'enveloppe : les redoubler ici trace un liseré au bord de la feuille mobile.
    class: 'flex h-full flex-col overflow-y-auto p-5',
  },
})
export class RosterAside {
  private readonly events = inject(EventsStore);
  private readonly toast = inject(ToastService);

  readonly eventId = input<string | undefined>(undefined);

  protected readonly icBell = LucideBell;

  protected readonly reminding = signal(false);

  protected readonly event = computed(() => {
    const id = this.eventId();
    return id ? this.events.events()[id] : undefined;
  });

  protected readonly roster = computed<RosterRow[]>(() => this.event()?.roster ?? []);

  protected readonly rosterLoading = computed(() => {
    const status = this.event()?.rosterStatus;
    return status === 'init' || status === 'loading' || status === 'refreshing';
  });

  protected readonly stats = computed(() => {
    const r = this.roster();
    const count = (s: Presence) => r.filter((x) => x.status === s).length;
    return [
      { label: 'Présent·e', value: count(Presence.PRESENT), colorClass: 'text-ok' },
      { label: 'Absent·e', value: count(Presence.ABSENT), colorClass: 'text-red' },
      { label: 'Non répondu', value: count(Presence.PENDING), colorClass: 'text-warn' },
    ];
  });

  protected readonly responseRate = computed(() => {
    const r = this.roster();
    if (r.length === 0) {
      return { pct: 0, count: 0, presentPct: 0, absentPct: 0, pendingPct: 0 };
    }
    const present = r.filter((x) => x.status === Presence.PRESENT).length;
    const absent = r.filter((x) => x.status === Presence.ABSENT).length;
    const pending = r.filter((x) => x.status === Presence.PENDING).length;
    return {
      pct: Math.round(((present + absent) / r.length) * 100),
      count: r.length,
      presentPct: (present / r.length) * 100,
      absentPct: (absent / r.length) * 100,
      pendingPct: (pending / r.length) * 100,
    };
  });

  protected readonly formattedDate = computed(() => {
    const date = this.event()?.date;
    if (!date) return '';
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  });

  constructor() {
    effect(() => {
      const id = this.eventId();
      if (id) untracked(() => void this.events.loadEventRoster(id));
    });
  }

  /**
   * Les trois issues d'un succès sont distinctes à l'écran parce qu'elles le
   * sont pour la personne qui clique : sans le cas « déjà relancés », elle
   * recliquerait indéfiniment sur un bouton qui ne fait plus rien.
   */
  protected async remind(): Promise<void> {
    const id = this.eventId();
    if (!id || this.reminding()) return;

    this.reminding.set(true);
    const outcome = await this.events.remindPending(id);
    this.reminding.set(false);

    if (!outcome.ok) {
      this.toast.show({
        type: 'error',
        title: 'Relance impossible',
        message: messageOf(outcome.error, 'La relance a échoué.'),
      });
      return;
    }

    const { queued, alreadySent } = outcome.result;

    if (queued > 0) {
      const plural = queued === 1 ? '' : 's';
      this.toast.show({
        type: 'success',
        title: `${queued} membre${plural} relancé${plural}.`,
      });
      void this.events.loadEventRoster(id);
      return;
    }

    this.toast.show({
      type: 'info',
      title: alreadySent > 0 ? 'Déjà relancés aujourd’hui.' : 'Tout le monde a répondu.',
    });
  }

  protected rosterStatusBadge(r: RosterRow): { label: string; kind: BadgeKind; dot: boolean } {
    if (r.status === Presence.PRESENT) return { label: 'Présent·e', kind: 'ok', dot: false };
    if (r.status === Presence.ABSENT) return { label: 'Absent·e', kind: 'red', dot: false };
    if (r.late) return { label: 'Rappelé·e', kind: 'warn', dot: true };
    return { label: '—', kind: 'neutral', dot: false };
  }
}

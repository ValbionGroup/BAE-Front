import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { LucideBell } from '@lucide/angular';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';
import { Avatar } from '#shared/components/ui/avatar/avatar';
import { EventData, Presence, RosterRow } from '#core/models/event.model';
import { EventsStore } from '#core/store/events.store';

@Component({
  selector: 'bfd-presences-roster-aside',
  imports: [Btn, Badge, Avatar],
  templateUrl: './roster-aside.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'complementary',
    class: 'flex h-full flex-col overflow-y-auto border-l border-border-s bg-surface p-5',
  },
})
export class RosterAside {
  private readonly events = inject(EventsStore);

  readonly event = input<EventData | undefined>(undefined);

  protected readonly icBell = LucideBell;

  private readonly eventId = computed(() => this.event()?.id);

  protected readonly eventDetail = computed(() => {
    const id = this.eventId();
    return id ? this.events.events()[id] : undefined;
  });

  protected readonly roster = computed<RosterRow[]>(() => this.eventDetail()?.roster ?? []);

  protected readonly rosterLoading = computed(() => {
    const status = this.eventDetail()?.rosterStatus;
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
    const e = this.event();
    if (!e) return '';
    return e.date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  });

  constructor() {
    effect(() => {
      const id = this.eventId();
      if (id) untracked(() => this.events.loadEventRoster(id));
    });
  }

  protected rosterStatusBadge(r: RosterRow): { label: string; kind: BadgeKind; dot: boolean } {
    if (r.status === Presence.PRESENT) return { label: 'Présent·e', kind: 'ok', dot: false };
    if (r.status === Presence.ABSENT) return { label: 'Absent·e', kind: 'red', dot: false };
    if (r.late) return { label: 'Rappelé·e', kind: 'warn', dot: true };
    return { label: '—', kind: 'neutral', dot: false };
  }
}

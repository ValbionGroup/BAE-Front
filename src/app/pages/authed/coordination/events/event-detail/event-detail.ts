import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideCalendar,
  LucideCheck,
  LucideChefHat,
  LucideClock,
  LucideDynamicIcon,
  LucidePlus,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import { Badge } from '#shared/components/ui/badge/badge';
import { Btn } from '#shared/components/ui/btn/btn';
import { Field } from '#shared/components/ui/field/field';
import { Input } from '#shared/components/ui/input/input';
import { Toggle } from '#shared/components/ui/toggle/toggle';
import {
  CoordinationService,
  type ApiEvent,
} from '#core/services/coordination/coordination-service';
import type { CoordinationEvent, EditState, OptionRow } from '../events.types';

function calcDuration(startHHMM: string, endHHMM: string): number {
  const [sh, sm] = startHHMM.split(':').map(Number);
  const [eh, em] = endHHMM.split(':').map(Number);
  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 24 * 60;
  return (endMin - startMin) * 60;
}

function calcEndTime(startHHMM: string, durationSeconds: number): string {
  const [sh, sm] = startHHMM.split(':').map(Number);
  const endMin = (sh * 60 + sm + Math.round(durationSeconds / 60)) % (24 * 60);
  return `${Math.floor(endMin / 60)
    .toString()
    .padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}`;
}

const DEFAULT_OPTIONS: ReadonlyArray<Readonly<OptionRow>> = [
  {
    key: 'precommandes',
    label: 'Précommandes en ligne',
    hint: "Page publique active jusqu'à J-1 18:30",
    enabled: false,
  },
  {
    key: 'inscription',
    label: 'Inscription obligatoire',
    hint: 'Limite à 22 membres BAE pour le service',
    enabled: false,
  },
  {
    key: 'public',
    label: 'Soirée publique',
    hint: "Visible sur la page d'accueil publique",
    enabled: false,
  },
  {
    key: 'lock',
    label: 'Verrouiller le menu',
    hint: 'Empêche modification après J-2',
    enabled: false,
  },
];

@Component({
  selector: 'bfd-coordination-event-detail',
  imports: [Badge, Btn, Field, Input, Toggle, LucideDynamicIcon],
  templateUrl: './event-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col min-w-0 overflow-hidden' },
})
export class CoordinationEventDetail {
  readonly event = input<CoordinationEvent | null>(null);
  readonly close = output<void>();
  readonly saved = output<ApiEvent>();

  private readonly svc = inject(CoordinationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly icCalendar = LucideCalendar;
  protected readonly icClock = LucideClock;
  protected readonly icX = LucideX;
  protected readonly icCheck = LucideCheck;
  protected readonly icChef = LucideChefHat;
  protected readonly icPlus = LucidePlus;
  protected readonly icTrash = LucideTrash2;

  protected readonly state = signal<EditState | null>(null);
  protected readonly saving = signal(false);

  constructor() {
    effect(() => {
      const ev = this.event();
      this.state.set(ev ? this.buildState(ev) : null);
    });
  }

  protected updateName(v: string): void {
    this.state.update((s) => (s ? { ...s, name: v } : s));
  }

  protected updateDate(v: string): void {
    this.state.update((s) => (s ? { ...s, date: v } : s));
  }

  protected updateTime(v: string): void {
    this.state.update((s) => (s ? { ...s, time: v } : s));
  }

  protected updateEndTime(v: string): void {
    this.state.update((s) => (s ? { ...s, endTime: v } : s));
  }

  protected updateDescription(ev: Event): void {
    const v = (ev.target as HTMLTextAreaElement).value;
    this.state.update((s) => (s ? { ...s, description: v } : s));
  }

  protected toggleOption(key: string, enabled: boolean): void {
    this.state.update((s) =>
      s ? { ...s, options: s.options.map((o) => (o.key === key ? { ...o, enabled } : o)) } : s,
    );
  }

  protected removeRecipe(name: string): void {
    this.state.update((s) => (s ? { ...s, recipes: s.recipes.filter((r) => r !== name) } : s));
  }

  protected save(): void {
    const s = this.state();
    if (!s || this.saving()) return;

    const [day, month, year] = s.date.split('/');
    const isoDate = `${year}-${month}-${day}T${s.time}:00`;
    const duration = s.endTime.trim() ? calcDuration(s.time, s.endTime.trim()) : null;

    this.saving.set(true);
    this.svc
      .updateEvent(Number(s.id), s.name, isoDate, duration)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ev) => {
          this.saving.set(false);
          this.saved.emit(ev);
        },
        error: () => {
          this.saving.set(false);
        },
      });
  }

  private buildState(event: CoordinationEvent): EditState {
    const dt = new Date(event.rawDate);
    const datePart = dt.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timePart = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const endTime = event.duration != null ? calcEndTime(timePart, event.duration) : '';

    return {
      id: String(event.id),
      statusLabel: event.statusLabel.toUpperCase(),
      statusKind: event.statusKind,
      createdAt: '—',
      name: event.name,
      date: datePart,
      time: timePart,
      endTime,
      description: '',
      recipes: [],
      options: DEFAULT_OPTIONS.map((o) => ({ ...o })),
    };
  }
}

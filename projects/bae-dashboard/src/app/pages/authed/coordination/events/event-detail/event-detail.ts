import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  LucideCalendar,
  LucideCheck,
  LucideClock,
  LucideDynamicIcon,
  LucideTrash2,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { Badge, Btn, Field, Input, Toggle } from '@bae/ui';
import { Router } from '@angular/router';
import { CoordinationStore } from '#core/store/coordination.store';
import { ModalService } from '#shared/components/modal/modal.service';
import { CoordinationDeleteModal } from '#shared/components/modal/coordination-delete-modal/coordination-delete-modal';
import { SponsorshipCategoriesModal } from '#shared/components/modal/sponsorship-categories-modal/sponsorship-categories-modal';
import type { CoordinationEvent, EditState } from '../events.types';

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

/** Proposé en ouvrant les précommandes : enregistrer 0 les rouvrirait fermées. */
const DEFAULT_CAPACITY = 100;

@Component({
  selector: 'bfd-coordination-event-detail',
  imports: [Badge, Btn, Field, Input, Toggle, LucideDynamicIcon],
  templateUrl: './event-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col min-w-0 overflow-hidden md:h-full' },
})
export class CoordinationEventDetail {
  readonly event = input<CoordinationEvent | null>(null);
  readonly close = output<void>();

  private readonly store = inject(CoordinationStore);
  private readonly modals = inject(ModalService);
  private readonly router = inject(Router);

  protected readonly icCalendar = LucideCalendar;
  protected readonly icClock = LucideClock;
  protected readonly icX = LucideX;
  protected readonly icCheck = LucideCheck;
  protected readonly icTrash = LucideTrash2;
  protected readonly icUsers = LucideUsers;

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

  protected togglePreOrders(enabled: boolean): void {
    this.state.update((s) => (s ? { ...s, capacity: enabled ? DEFAULT_CAPACITY : 0 } : s));
  }

  protected updateCapacity(value: string): void {
    const parsed = Number(value.trim());
    if (!Number.isFinite(parsed) || parsed < 0) return;
    this.state.update((s) => (s ? { ...s, capacity: Math.trunc(parsed) } : s));
  }

  protected attendeesText(s: EditState): string {
    return s.expectedAttendees === null ? '' : String(s.expectedAttendees);
  }

  protected updateAttendees(value: string): void {
    const trimmed = value.trim();
    const parsed = Number(trimmed);
    const next =
      trimmed === '' || !Number.isFinite(parsed) || parsed < 0 ? null : Math.trunc(parsed);
    this.state.update((s) => (s ? { ...s, expectedAttendees: next } : s));
  }

  protected closeLeadText(s: EditState): string {
    return s.preOrderCloseLeadHours === null ? '' : String(s.preOrderCloseLeadHours);
  }

  /**
   * ⚠️ Champ vide ⇒ `null`, jamais `0` : le serveur lit `null` comme « suivre la
   * valeur globale », alors que `0` fermerait les précommandes à l'instant même
   * où la soirée commence.
   */
  protected updateCloseLeadHours(value: string): void {
    const trimmed = value.trim();
    const parsed = Number(trimmed);
    const next =
      trimmed === '' || !Number.isFinite(parsed) || parsed < 0 ? null : Math.trunc(parsed);
    this.state.update((s) => (s ? { ...s, preOrderCloseLeadHours: next } : s));
  }

  /** Éteindre efface le payeur, jamais les catégories déjà saisies. */
  protected toggleSponsorship(enabled: boolean): void {
    this.state.update((s) => (s ? { ...s, payerName: enabled ? (s.payerName ?? '') : null } : s));
  }

  protected updatePayer(value: string): void {
    this.state.update((s) => (s ? { ...s, payerName: value } : s));
  }

  protected openCategories(): void {
    const s = this.state();
    if (!s) return;
    this.modals.open({
      type: 'component',
      component: SponsorshipCategoriesModal,
      inputs: { eventId: s.id, eventLabel: s.name },
    });
  }

  protected navigate(): void {
    const s = this.state();
    if (s) void this.router.navigate(['/coordination', s.id]);
  }

  protected openDelete(): void {
    const s = this.state();
    if (!s) return;
    this.modals.open({
      type: 'component',
      component: CoordinationDeleteModal,
      inputs: {
        eventName: s.name,
        eventId: Number(s.id),
        onDeleted: () => this.close.emit(),
      },
    });
  }

  protected save(): void {
    const s = this.state();
    if (!s || this.saving()) return;

    const [day, month, year] = s.date.split('/');
    const isoDate = `${year}-${month}-${day}T${s.time}:00`;
    const duration = s.endTime.trim() ? calcDuration(s.time, s.endTime.trim()) : null;

    this.saving.set(true);
    this.store
      .updateEvent(Number(s.id), {
        name: s.name,
        date: isoDate,
        duration,
        description: s.description.trim() || null,
        capacity: s.capacity,
        expectedAttendees: s.expectedAttendees,
        payerName: s.payerName?.trim() || null,
        preOrderCloseLeadHours: s.preOrderCloseLeadHours,
      })
      .finally(() => this.saving.set(false));
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
      description: event.description ?? '',
      capacity: event.capacity,
      expectedAttendees: event.expectedAttendees,
      payerName: event.payerName,
      preOrderCloseLeadHours: event.preOrderCloseLeadHours,
    };
  }
}

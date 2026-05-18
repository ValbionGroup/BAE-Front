import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideChevronRight, LucideDynamicIcon, LucidePlus } from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { CoordinationService, type CoordinationApiData } from '#core/services/coordination/coordination-service';
import { ModalService } from '#shared/components/modal/modal.service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';

interface CoordinationEvent {
  readonly id: number;
  readonly day: string;
  readonly month: string;
  readonly name: string;
  readonly sub: string;
  readonly assigned: number;
  readonly required: number;
  readonly status: 'preparation' | 'ready' | 'past';
  readonly time: string;
}

@Component({
  selector: 'bfd-coordination-events',
  imports: [RouterLink, Btn, Badge, LucideDynamicIcon],
  templateUrl: './events.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoordinationEvents implements OnInit {
  private readonly svc = inject(CoordinationService);
  private readonly pageHeader = inject(PageHeaderService);
  private readonly modal = inject(ModalService);
  private readonly router = inject(Router);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  constructor() {
    this.pageHeader.set({
      title: 'Coordination',
      subtitle: 'Sélectionnez une soirée',
      breadcrumb: ['Préparation', 'Coordination'],
      activeNavId: 'coord',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  protected readonly icPlus = LucidePlus;
  protected readonly icChevronRight = LucideChevronRight;

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly events = signal<CoordinationEvent[]>([]);

  ngOnInit(): void {
    this.loadEvents();
  }

  protected progressClass(e: CoordinationEvent): string {
    const pct = e.required > 0 ? e.assigned / e.required : 0;
    if (pct >= 1) return 'bg-ok';
    if (pct >= 0.5) return 'bg-warn';
    return 'bg-red';
  }

  protected progressPct(e: CoordinationEvent): number {
    return e.required > 0 ? Math.round((e.assigned / e.required) * 100) : 0;
  }

  protected statusBadge(e: CoordinationEvent): { label: string; kind: BadgeKind; dot: boolean } {
    if (e.status === 'past') return { label: 'Terminée', kind: 'neutral', dot: false };
    if (e.assigned >= e.required) return { label: 'Prête', kind: 'ok', dot: true };
    return { label: 'En préparation', kind: 'warn', dot: true };
  }

  protected openCreateEventModal(): void {
    this.modal.open({
      type: 'create-event',
      title: 'Nouvelle soiree',
      message: 'Renseignez le nom et la date de la soiree.',
      onCreate: (payload) => this.createEvent(payload.name, payload.date, payload.time),
    });
  }

  private createEvent(name: string, date: string, time: string): void {
    const trimmed = name.trim();
    if (!trimmed || !date) return;
    const timeValue = time?.trim() || '19:00';
    const dateTime = new Date(`${date}T${timeValue}:00`);
    if (Number.isNaN(dateTime.getTime())) {
      this.loadError.set('Date invalide pour la soiree.');
      return;
    }

    this.loading.set(true);
    this.loadError.set(null);
    this.svc.createEvent(trimmed, dateTime.toISOString()).subscribe({
      next: (event) => {
        this.loadEvents();
        this.router.navigate(['/coordination', event.id]);
      },
      error: () => {
        this.loadError.set('Impossible de créer la soiree.');
        this.loading.set(false);
      },
    });
  }

  private loadEvents(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.svc.loadAll().subscribe({
      next: (raw) => {
        this.events.set(this.buildEvents(raw));
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Impossible de charger les soirées.');
        this.loading.set(false);
      },
    });
  }

  private buildEvents(raw: CoordinationApiData): CoordinationEvent[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assignmentsByEvent = new Map<number, number>();
    for (const assignment of raw.assignments) {
      assignmentsByEvent.set(
        assignment.eventId,
        (assignmentsByEvent.get(assignment.eventId) ?? 0) + 1,
      );
    }

    const requiredByEvent = new Map<number, number>();
    for (const eventJob of raw.eventJobs) {
      requiredByEvent.set(
        eventJob.eventId,
        (requiredByEvent.get(eventJob.eventId) ?? 0) + eventJob.count,
      );
    }

    return raw.events
      .map((event) => {
        const date = new Date(event.date);
        const assigned = assignmentsByEvent.get(event.id) ?? 0;
        const required = requiredByEvent.get(event.id) ?? 0;
        const status: CoordinationEvent['status'] =
          date < today ? 'past' : assigned >= required && required > 0 ? 'ready' : 'preparation';

        return {
          id: event.id,
          day: date.toLocaleDateString('fr-FR', { day: '2-digit' }),
          month: date.toLocaleDateString('fr-FR', { month: 'short' }),
          name: event.name,
          sub: '—',
          assigned,
          required,
          status,
          time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        };
      })
      .sort((a, b) => {
        const aDate = raw.events.find(e => e.id === a.id)?.date ?? '';
        const bDate = raw.events.find(e => e.id === b.id)?.date ?? '';
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      });
  }
}

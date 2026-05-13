import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideChevronRight, LucideDynamicIcon, LucidePlus } from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';

interface CoordinationEvent {
  readonly id: string;
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
export class CoordinationEvents {
  private readonly pageHeader = inject(PageHeaderService);
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

  protected readonly events: readonly CoordinationEvent[] = [
    {
      id: 'soiree-hivernale',
      day: '14',
      month: 'fév',
      name: 'Soirée Hivernale',
      sub: 'Hot-dogs · Bières · Crêpes',
      assigned: 11,
      required: 18,
      status: 'preparation',
      time: '19:30 — 23:00',
    },
    {
      id: 'soiree-carnaval',
      day: '07',
      month: 'mar',
      name: 'Soirée Carnaval',
      sub: 'Tapas · Sangria',
      assigned: 0,
      required: 16,
      status: 'preparation',
      time: '20:00 — 23:30',
    },
    {
      id: 'repas-alternants',
      day: '28',
      month: 'mar',
      name: 'Repas Alternant·e·s',
      sub: 'Pâtes carbonara',
      assigned: 0,
      required: 12,
      status: 'preparation',
      time: '19:00 — 22:00',
    },
    {
      id: 'soiree-bienvenue',
      day: '24',
      month: 'jan',
      name: 'Soirée Bienvenue 2026',
      sub: 'Plateaux mixtes · cocktails',
      assigned: 18,
      required: 18,
      status: 'past',
      time: '19:30 — 23:30',
    },
  ];

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
}

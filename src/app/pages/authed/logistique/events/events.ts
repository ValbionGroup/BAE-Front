import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideChefHat,
  LucideChevronRight,
  LucideDynamicIcon,
  LucideMinus,
  LucidePlus,
  LucideTrash2,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';

interface RecipeLine {
  readonly id: string;
  readonly name: string;
  readonly unitCost: number;
  count: number;
}

interface EventBlock {
  readonly id: string;
  readonly day: string;
  readonly month: string;
  readonly name: string;
  readonly time: string;
  readonly status: 'preparation' | 'ready' | 'past';
  readonly recipes: RecipeLine[];
}

@Component({
  selector: 'bfd-logistique-events',
  imports: [RouterLink, Btn, Badge, LucideDynamicIcon],
  templateUrl: './events.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogistiqueEvents {
  constructor() {
    inject(PageHeaderService).set({
      title: 'Logistique',
      subtitle: 'Recettes & courses par soirée',
      breadcrumb: ['Préparation', 'Logistique'],
      activeNavId: 'log',
    });
  }

  protected readonly icChef = LucideChefHat;
  protected readonly icPlus = LucidePlus;
  protected readonly icMinus = LucideMinus;
  protected readonly icTrash = LucideTrash2;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icChevronRight = LucideChevronRight;

  protected readonly events = signal<EventBlock[]>([
    {
      id: 'soiree-hivernale',
      day: '14',
      month: 'fév',
      name: 'Soirée Hivernale',
      time: '19:30 — 23:00',
      status: 'preparation',
      recipes: [
        { id: 'hd-clas', name: 'Hot-dog classique', unitCost: 1.12, count: 80 },
        { id: 'hd-veg', name: 'Hot-dog veggie', unitCost: 1.34, count: 30 },
        { id: 'frites', name: 'Frites portion', unitCost: 0.42, count: 50 },
        { id: 'crepe-n', name: 'Crêpe Nutella', unitCost: 0.55, count: 40 },
      ],
    },
    {
      id: 'soiree-carnaval',
      day: '07',
      month: 'mar',
      name: 'Soirée Carnaval',
      time: '20:00 — 23:30',
      status: 'preparation',
      recipes: [
        { id: 'tapas', name: 'Plateau tapas', unitCost: 2.4, count: 18 },
        { id: 'sangria', name: 'Sangria (verre)', unitCost: 0.65, count: 90 },
      ],
    },
    {
      id: 'repas-alternants',
      day: '28',
      month: 'mar',
      name: 'Repas Alternant·e·s',
      time: '19:00 — 22:00',
      status: 'preparation',
      recipes: [
        { id: 'carbonara', name: 'Pâtes carbonara', unitCost: 1.05, count: 60 },
        { id: 'salade', name: 'Salade verte', unitCost: 0.4, count: 60 },
      ],
    },
  ]);

  protected formatPrice(n: number): string {
    return n.toFixed(2).replace('.', ',');
  }

  protected totalCost(e: EventBlock): number {
    return e.recipes.reduce((s, r) => s + r.unitCost * r.count, 0);
  }

  protected totalPortions(e: EventBlock): number {
    return e.recipes.reduce((s, r) => s + r.count, 0);
  }

  protected statusBadge(e: EventBlock): { label: string; kind: BadgeKind; dot: boolean } {
    if (e.status === 'past') return { label: 'Terminée', kind: 'neutral', dot: false };
    return { label: 'En préparation', kind: 'warn', dot: true };
  }

  protected inc(e: EventBlock, r: RecipeLine): void {
    this.events.update((list) =>
      list.map((ev) =>
        ev.id !== e.id
          ? ev
          : { ...ev, recipes: ev.recipes.map((x) => (x.id === r.id ? { ...x, count: x.count + 1 } : x)) },
      ),
    );
  }

  protected dec(e: EventBlock, r: RecipeLine): void {
    this.events.update((list) =>
      list.map((ev) =>
        ev.id !== e.id
          ? ev
          : {
              ...ev,
              recipes: ev.recipes.map((x) =>
                x.id === r.id ? { ...x, count: Math.max(0, x.count - 1) } : x,
              ),
            },
      ),
    );
  }

  protected remove(e: EventBlock, r: RecipeLine): void {
    this.events.update((list) =>
      list.map((ev) =>
        ev.id !== e.id ? ev : { ...ev, recipes: ev.recipes.filter((x) => x.id !== r.id) },
      ),
    );
  }

  protected add(e: EventBlock): void {
    // Add a placeholder new recipe — picker UI is out of scope for the mock.
    const id = `rec-${Math.random().toString(36).slice(2, 8)}`;
    this.events.update((list) =>
      list.map((ev) =>
        ev.id !== e.id
          ? ev
          : { ...ev, recipes: [...ev.recipes, { id, name: 'Nouvelle recette', unitCost: 1.0, count: 10 }] },
      ),
    );
  }
}

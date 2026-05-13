import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideChefHat,
  LucideDynamicIcon,
  LucideMinus,
  LucidePlus,
  LucideTrash2,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Recipe, RecipesService } from '#core/services/recipes/recipes-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';
import { DropdownService } from '#shared/components/dropdown/dropdown.service';
import { DropdownItem } from '#shared/components/dropdown/dropdown.models';

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
  private readonly recipesService = inject(RecipesService);
  private readonly dropdown = inject(DropdownService);

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

  protected readonly catalog = this.recipesService.recipes;

  protected readonly events = signal<EventBlock[]>([
    {
      id: 'soiree-hivernale',
      day: '14',
      month: 'fév',
      name: 'Soirée Hivernale',
      time: '19:30 — 23:00',
      status: 'preparation',
      recipes: this.seed([
        ['hd-clas', 80],
        ['hd-veg', 30],
        ['frites', 50],
        ['crepe-n', 40],
      ]),
    },
    {
      id: 'soiree-carnaval',
      day: '07',
      month: 'mar',
      name: 'Soirée Carnaval',
      time: '20:00 — 23:30',
      status: 'preparation',
      recipes: this.seed([
        ['tapas', 18],
        ['sangria', 90],
      ]),
    },
    {
      id: 'repas-alternants',
      day: '28',
      month: 'mar',
      name: 'Repas Alternant·e·s',
      time: '19:00 — 22:00',
      status: 'preparation',
      recipes: this.seed([
        ['carbonara', 60],
        ['salade', 60],
      ]),
    },
  ]);

  private seed(entries: readonly (readonly [string, number])[]): RecipeLine[] {
    return entries.flatMap(([id, count]) => {
      const r = this.recipesService.byId(id);
      return r ? [{ id: r.id, name: r.nom, unitCost: r.cout, count }] : [];
    });
  }

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

  protected openRecipePicker(e: EventBlock, ev: MouseEvent): void {
    ev.stopPropagation();
    // Resolve the actual <button> the user clicked (bfd-btn renders a <button> child).
    const anchor = this.resolveAnchor(ev.currentTarget);
    if (!anchor) return;

    const taken = new Set(e.recipes.map((r) => r.id));
    const available = this.catalog().filter((c) => !taken.has(c.id));

    const items: readonly DropdownItem[] = available.map((c) => ({
      type: 'action',
      icon: LucideChefHat,
      label: c.nom,
      description: c.usage,
      trailing: `${this.formatPrice(c.cout)} €`,
      onClick: () => this.addFromCatalog(e, c),
    }));

    this.dropdown.toggle({
      anchor,
      placement: 'bottom-end',
      width: 320,
      header: `Recettes disponibles (${available.length})`,
      emptyLabel: 'Toutes les recettes sont déjà ajoutées.',
      items,
    });
  }

  private resolveAnchor(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof HTMLElement)) return null;
    // Closest <button> is the actual interactive anchor floating-ui should
    // position against (bfd-btn host is just a wrapper).
    return target.closest('button') ?? target;
  }

  private addFromCatalog(e: EventBlock, c: Recipe): void {
    this.events.update((list) =>
      list.map((ev) =>
        ev.id !== e.id
          ? ev
          : {
              ...ev,
              recipes: [...ev.recipes, { id: c.id, name: c.nom, unitCost: c.cout, count: 10 }],
            },
      ),
    );
  }

  protected inc(e: EventBlock, r: RecipeLine): void {
    this.events.update((list) =>
      list.map((ev) =>
        ev.id !== e.id
          ? ev
          : {
              ...ev,
              recipes: ev.recipes.map((x) => (x.id === r.id ? { ...x, count: x.count + 1 } : x)),
            },
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
}

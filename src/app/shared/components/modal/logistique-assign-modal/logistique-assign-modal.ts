import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  LucideCheck,
  LucideChefHat,
  LucideDynamicIcon,
  LucideSearch,
  LucideStar,
  LucideTriangleAlert,
} from '@lucide/angular';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Input } from '#shared/components/ui/input/input';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

interface Recipe {
  readonly n: string;
  readonly c: string;
  readonly cost: number;
  readonly marge: number;
  sel: boolean;
  q: number;
  readonly star: boolean;
}

@Component({
  selector: 'bfd-logistique-assign-modal',
  imports: [Btn, Badge, Input, ModalShell, LucideDynamicIcon],
  templateUrl: './logistique-assign-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogistiqueAssignModal {
  readonly id = input.required<string>();
  readonly eventLabel = input<string>('SOIRÉE HIVERNALE · 14/02');

  private readonly modalService = inject(ModalService);

  protected readonly icSearch = LucideSearch;
  protected readonly icChef = LucideChefHat;
  protected readonly icCheck = LucideCheck;
  protected readonly icStar = LucideStar;
  protected readonly icAlert = LucideTriangleAlert;

  protected readonly cats = ['Tout', 'Plats', 'Accompagnements', 'Boissons', 'Desserts'];
  protected readonly activeCat = signal(0);

  protected readonly recipes = signal<readonly Recipe[]>([
    { n: 'Hot-dog classique', c: 'Plats', cost: 1.12, marge: 1.88, sel: true, q: 220, star: true },
    { n: 'Hot-dog veggie', c: 'Plats', cost: 1.34, marge: 2.16, sel: true, q: 40, star: false },
    { n: 'Croque-monsieur', c: 'Plats', cost: 0.85, marge: 1.65, sel: false, q: 0, star: false },
    {
      n: 'Frites portion',
      c: 'Accompagnements',
      cost: 0.42,
      marge: 1.58,
      sel: true,
      q: 180,
      star: true,
    },
    { n: 'Crêpe sucre', c: 'Desserts', cost: 0.3, marge: 1.2, sel: false, q: 0, star: false },
    { n: 'Crêpe Nutella', c: 'Desserts', cost: 0.55, marge: 1.45, sel: true, q: 90, star: false },
    { n: 'Kir cassis', c: 'Boissons', cost: 0.65, marge: 1.85, sel: false, q: 0, star: false },
    { n: 'Panaché 25cl', c: 'Boissons', cost: 0.95, marge: 1.55, sel: true, q: 220, star: false },
  ]);

  protected readonly selected = computed(() => this.recipes().filter((r) => r.sel));
  protected readonly totalSelected = computed(() => this.selected().length);
  protected readonly totalPortions = computed(() =>
    this.selected().reduce((s, r) => s + r.q, 0),
  );
  protected readonly totalCost = computed(() =>
    Math.round(this.selected().reduce((s, r) => s + r.q * r.cost, 0)),
  );
  protected readonly totalRev = computed(() =>
    Math.round(this.selected().reduce((s, r) => s + r.q * (r.cost + r.marge), 0)),
  );

  protected toggleRecipe(n: string): void {
    this.recipes.update((arr) =>
      arr.map((r) => (r.n === n ? { ...r, sel: !r.sel, q: r.sel ? 0 : Math.max(r.q, 100) } : r)),
    );
  }

  protected incQ(n: string): void {
    this.recipes.update((arr) => arr.map((r) => (r.n === n ? { ...r, q: r.q + 10 } : r)));
  }

  protected decQ(n: string): void {
    this.recipes.update((arr) =>
      arr.map((r) => (r.n === n ? { ...r, q: Math.max(0, r.q - 10) } : r)),
    );
  }

  protected close(): void {
    this.modalService.close(this.id());
  }

  protected fmt(v: number): string {
    return v.toFixed(2).replace('.', ',');
  }
}

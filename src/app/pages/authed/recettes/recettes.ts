import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  LucideChefHat,
  LucideDynamicIcon,
  LucideEllipsis,
  LucideMoreHorizontal,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideStar,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { RecipesService } from '#core/services/recipes/recipes-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Input } from '#shared/components/ui/input/input';

interface Ingredient {
  readonly n: string;
  readonly q: string;
  readonly c: number;
  readonly lot: string;
  readonly stock: string | number;
  readonly warn: boolean;
}

@Component({
  selector: 'bfd-recettes',
  imports: [Btn, Badge, Input, LucideDynamicIcon],
  templateUrl: './recettes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Recettes {
  constructor() {
    inject(PageHeaderService).set({
      title: 'Recettes',
      subtitle: '8 recettes actives · coût moyen 0,77 €',
      breadcrumb: ['Préparation', 'Recettes'],
      activeNavId: 'recettes',
    });
  }

  protected readonly icChef = LucideChefHat;
  protected readonly icSearch = LucideSearch;
  protected readonly icPlus = LucidePlus;
  protected readonly icEdit = LucidePencil;
  protected readonly icMore = LucideEllipsis;
  protected readonly icStar = LucideStar;

  protected readonly filterTabs = ['Tout', 'Plats', 'Accompagnements', 'Boissons', 'Desserts'];
  protected readonly activeFilter = signal(0);
  protected readonly selectedIdx = signal(0);

  protected readonly recettes = inject(RecipesService).recipes;

  protected readonly ingredients: readonly Ingredient[] = [
    { n: 'Saucisse Strasbourg', q: '1 pc', c: 0.35, lot: 'L23-117', stock: 24, warn: true },
    { n: 'Pain hot-dog', q: '1 pc', c: 0.28, lot: 'L24-009', stock: 86, warn: false },
    { n: 'Moutarde Amora', q: '5 g', c: 0.04, lot: '—', stock: 'OK', warn: false },
    { n: 'Ketchup Heinz', q: '8 g', c: 0.05, lot: '—', stock: 'OK', warn: false },
    { n: 'Oignons frits', q: '4 g', c: 0.4, lot: 'L24-016', stock: 12, warn: false },
  ];

  protected readonly methode = [
    'Faire chauffer la plancha à 180°C.',
    'Faire griller la saucisse 4 min en la retournant à mi-cuisson.',
    'Pendant ce temps, ouvrir le pain et le passer 30s côté mie.',
    "Disposer saucisse, moutarde, ketchup, finir avec une cuillère d'oignons frits.",
  ];

  protected formatPrice(n: number): string {
    return n.toFixed(2).replace('.', ',');
  }
}

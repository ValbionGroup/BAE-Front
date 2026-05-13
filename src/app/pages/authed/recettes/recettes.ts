import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  LucideChefHat,
  LucideDynamicIcon, LucideEllipsis,
  LucideMoreHorizontal,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideStar,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Input } from '#shared/components/ui/input/input';

interface Recette {
  readonly id: string;
  readonly nom: string;
  readonly ing: number;
  readonly cout: number;
  readonly prix: number;
  readonly marge: number;
  readonly star: boolean;
  readonly usage: string;
}

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

  protected readonly recettes: readonly Recette[] = [
    {
      id: 'hd-clas',
      nom: 'Hot-dog classique',
      ing: 5,
      cout: 1.12,
      prix: 3.0,
      marge: 1.88,
      star: true,
      usage: 'Plat principal',
    },
    {
      id: 'hd-veg',
      nom: 'Hot-dog veggie',
      ing: 6,
      cout: 1.34,
      prix: 3.5,
      marge: 2.16,
      star: false,
      usage: 'Végé',
    },
    {
      id: 'crq',
      nom: 'Croque-monsieur',
      ing: 4,
      cout: 0.85,
      prix: 2.5,
      marge: 1.65,
      star: false,
      usage: 'Plat principal',
    },
    {
      id: 'frt-pkt',
      nom: 'Frites portion',
      ing: 2,
      cout: 0.42,
      prix: 2.0,
      marge: 1.58,
      star: true,
      usage: 'Accompagnement',
    },
    {
      id: 'crepe-s',
      nom: 'Crêpe sucre',
      ing: 3,
      cout: 0.3,
      prix: 1.5,
      marge: 1.2,
      star: false,
      usage: 'Dessert',
    },
    {
      id: 'crepe-n',
      nom: 'Crêpe Nutella',
      ing: 4,
      cout: 0.55,
      prix: 2.0,
      marge: 1.45,
      star: false,
      usage: 'Dessert',
    },
    {
      id: 'kir',
      nom: 'Kir cassis (1 v.)',
      ing: 2,
      cout: 0.65,
      prix: 2.5,
      marge: 1.85,
      star: false,
      usage: 'Boisson',
    },
    {
      id: 'pano',
      nom: 'Panaché 25cl',
      ing: 2,
      cout: 0.95,
      prix: 2.5,
      marge: 1.55,
      star: false,
      usage: 'Boisson',
    },
  ];

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

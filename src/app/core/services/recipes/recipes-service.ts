import { Injectable, signal } from '@angular/core';

export type RecipeUsage = 'Plat principal' | 'Accompagnement' | 'Boisson' | 'Dessert' | 'Végé';

export interface Recipe {
  readonly id: string;
  readonly nom: string;
  readonly ing: number;
  readonly cout: number;
  readonly prix: number;
  readonly marge: number;
  readonly star: boolean;
  readonly usage: RecipeUsage;
}

/**
 * Recipe catalog. Backed by a static seed list today; the back-end will hydrate
 * this signal once the API is wired (planned: GET /recipes).
 */
@Injectable({ providedIn: 'root' })
export class RecipesService {
  private readonly _recipes = signal<readonly Recipe[]>([
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
      id: 'frites',
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
    {
      id: 'tapas',
      nom: 'Plateau tapas',
      ing: 8,
      cout: 2.4,
      prix: 5.5,
      marge: 3.1,
      star: false,
      usage: 'Plat principal',
    },
    {
      id: 'sangria',
      nom: 'Sangria (verre)',
      ing: 5,
      cout: 0.65,
      prix: 2.5,
      marge: 1.85,
      star: false,
      usage: 'Boisson',
    },
    {
      id: 'carbonara',
      nom: 'Pâtes carbonara',
      ing: 6,
      cout: 1.05,
      prix: 3.5,
      marge: 2.45,
      star: false,
      usage: 'Plat principal',
    },
    {
      id: 'salade',
      nom: 'Salade verte',
      ing: 3,
      cout: 0.4,
      prix: 1.5,
      marge: 1.1,
      star: false,
      usage: 'Accompagnement',
    },
  ]);

  readonly recipes = this._recipes.asReadonly();

  byId(id: string): Recipe | undefined {
    return this._recipes().find((r) => r.id === id);
  }
}

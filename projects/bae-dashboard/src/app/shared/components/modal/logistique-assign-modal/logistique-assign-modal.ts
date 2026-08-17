import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  LucideCheck,
  LucideChefHat,
  LucideDynamicIcon,
  LucideSearch,
  LucideStar,
  LucideTriangleAlert,
} from '@lucide/angular';
import { Btn, Badge, Input, ToastService } from '@bae/ui';
import { EventsStore } from '#core/store/events.store';
import { RecipesStore } from '#core/store/recipes.store';
import type { MenuItem } from '#core/models/event.model';
import type { RecipeProduct } from '#pages/authed/recettes/recipes.types';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Une ligne de la modale d'assignation.
 *
 * Les noms courts (`n`, `c`, `q`, `sel`) sont ceux que le gabarit utilise depuis
 * la conversion de la maquette : ils sont conservés tels quels pour que le
 * gabarit n'ait pas à changer, seule la **source** des données devient réelle.
 *
 * `marge` est la marge unitaire — dernier prix de vente connu moins le coût des
 * denrées. Elle vaut 0 quand l'un des deux est inconnu, plutôt qu'un chiffre
 * inventé.
 */
interface Recipe {
  /** Clé réelle pour les écritures. Le gabarit, lui, piste par `n`. */
  readonly productId: number;
  readonly n: string;
  readonly c: string;
  readonly cost: number;
  readonly marge: number;
  sel: boolean;
  q: number;
  readonly star: boolean;
}

/** Quantité proposée pour une recette qu'on vient de cocher. */
const DEFAULT_QUANTITY = 100;

const ALL_CATEGORIES = 'Tout';

@Component({
  selector: 'bfd-logistique-assign-modal',
  imports: [Btn, Badge, Input, ModalShell, LucideDynamicIcon],
  templateUrl: './logistique-assign-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogistiqueAssignModal {
  readonly id = input.required<string>();
  /** La soirée dont on compose le menu. */
  readonly eventId = input.required<string>();
  readonly eventLabel = input<string>('SOIRÉE');

  private readonly modalService = inject(ModalService);
  private readonly events = inject(EventsStore);
  private readonly recipesStore = inject(RecipesStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly icSearch = LucideSearch;
  protected readonly icChef = LucideChefHat;
  protected readonly icCheck = LucideCheck;
  protected readonly icStar = LucideStar;
  protected readonly icAlert = LucideTriangleAlert;

  protected readonly activeCat = signal(0);
  protected readonly saving = signal(false);

  /**
   * Toutes les recettes du catalogue, cochées et quantifiées selon le menu
   * actuel de la soirée. Mutée localement par les gestes de la modale ; rien
   * n'est écrit avant `save()`.
   */
  private readonly allRecipes = signal<readonly Recipe[]>([]);

  /**
   * Le menu tel qu'il était à l'ouverture, pour que `save()` n'écrive que les
   * différences. Sans cette référence il faudrait tout réécrire à chaque
   * enregistrement, y compris les lignes intactes.
   */
  private readonly initialMenu = signal<ReadonlyMap<number, number>>(new Map());

  constructor() {
    void this.recipesStore.load();

    // Le menu peut ne pas être chargé si la modale est ouverte avant que la
    // page ait fini : on le demande, l'effet ci-dessous réagira à son arrivée.
    effect(() => {
      const event = this.events.getEventById(this.eventId());
      if (event?.menuStatus === 'init') void this.events.loadEventMenu(this.eventId());
    });

    // Amorce la sélection dès que catalogue ET menu sont disponibles, une seule
    // fois : au-delà, l'état local appartient à l'utilisateur de la modale et un
    // rechargement ne doit pas écraser ses coches.
    effect(() => {
      const catalog = this.recipesStore.products();
      const event = this.events.getEventById(this.eventId());
      if (catalog.length === 0 || event?.menuStatus !== 'loaded') return;
      if (this.allRecipes().length > 0) return;

      const menu = event.menu ?? [];
      this.initialMenu.set(new Map(menu.map((line) => [line.productId, line.quantity])));
      this.allRecipes.set(catalog.map((product) => this.toRecipe(product, menu)));
    });
  }

  private toRecipe(product: RecipeProduct, menu: readonly MenuItem[]): Recipe {
    const line = menu.find((entry) => entry.productId === product.id);
    const cost = product.cost ?? 0;
    // Marge unitaire : prix de vente connu − coût des denrées. Les deux peuvent
    // manquer (une recette jamais vendue, une denrée sans fournisseur), et dans
    // ce cas 0 est plus honnête qu'une estimation.
    const marge =
      product.lastPrice !== null && product.cost !== null ? product.lastPrice - product.cost : 0;

    return {
      productId: product.id,
      n: product.name,
      c: product.category ?? 'Autres',
      cost,
      marge,
      sel: line !== undefined,
      q: line?.quantity ?? 0,
      // Aucune colonne « vedette » en base — le champ existe dans la maquette,
      // pas dans le schéma.
      star: false,
    };
  }

  /**
   * Les catégories présentes dans le catalogue, « Tout » en tête.
   *
   * Dérivées et non codées en dur : `products` n'a pas de catégorie propre, la
   * sienne vient de son ingrédient de plus bas rang, donc la liste dépend des
   * données.
   */
  protected readonly cats = computed<readonly string[]>(() => {
    const present = [...new Set(this.allRecipes().map((recipe) => recipe.c))].sort((a, b) =>
      a.localeCompare(b, 'fr'),
    );
    return [ALL_CATEGORIES, ...present];
  });

  /**
   * Ce que le gabarit affiche : le catalogue filtré par l'onglet actif.
   *
   * C'est ici que les onglets de catégories deviennent fonctionnels — ils
   * existaient dans la maquette sans rien filtrer.
   */
  protected readonly recipes = computed<readonly Recipe[]>(() => {
    const category = this.cats()[this.activeCat()] ?? ALL_CATEGORIES;
    const all = this.allRecipes();
    return category === ALL_CATEGORIES ? all : all.filter((recipe) => recipe.c === category);
  });

  /** Les totaux du pied de modale portent sur TOUTE la sélection, pas sur l'onglet. */
  protected readonly selected = computed(() => this.allRecipes().filter((r) => r.sel));
  protected readonly totalSelected = computed(() => this.selected().length);
  protected readonly totalPortions = computed(() => this.selected().reduce((s, r) => s + r.q, 0));
  protected readonly totalCost = computed(() =>
    Math.round(this.selected().reduce((s, r) => s + r.q * r.cost, 0)),
  );
  protected readonly totalRev = computed(() =>
    Math.round(this.selected().reduce((s, r) => s + r.q * (r.cost + r.marge), 0)),
  );

  private update(name: string, change: (recipe: Recipe) => Recipe): void {
    this.allRecipes.update((all) => all.map((r) => (r.n === name ? change(r) : r)));
  }

  protected toggleRecipe(n: string): void {
    this.update(n, (r) => ({
      ...r,
      sel: !r.sel,
      // En décochant on garde la quantité affichée à 0 ; en cochant on propose
      // une valeur de départ plutôt que 0, que l'API refuserait (< 1 → 422).
      q: r.sel ? 0 : Math.max(r.q, DEFAULT_QUANTITY),
    }));
  }

  protected incQ(n: string): void {
    this.update(n, (r) => ({ ...r, q: r.q + 10 }));
  }

  protected decQ(n: string): void {
    // Plancher à 1 et non à 0 pour une ligne cochée : `DELETE` exprime déjà
    // « cette ligne ne devrait pas exister », et l'API refuse `< 1`.
    this.update(n, (r) => ({ ...r, q: Math.max(r.sel ? 1 : 0, r.q - 10) }));
  }

  /**
   * Écrit les différences, puis mène à la liste de courses — ce que promet le
   * libellé du bouton.
   *
   * Trois gestes distincts, dans cet ordre : les retraits d'abord (ils libèrent
   * des lignes), puis les ajouts, puis les changements de quantité. Chaque appel
   * est indépendant, donc un refus sur une ligne n'empêche pas les autres — le
   * store porte l'erreur.
   */
  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);

    const eventId = this.eventId();
    const initial = this.initialMenu();
    const current = this.allRecipes();

    try {
      for (const [productId] of initial) {
        const recipe = current.find((r) => r.productId === productId);
        if (!recipe || !recipe.sel) await this.events.removeMenuLine(eventId, productId);
      }

      for (const recipe of current) {
        if (!recipe.sel) continue;
        const before = initial.get(recipe.productId);
        const quantity = Math.max(1, recipe.q);

        if (before === undefined) {
          await this.events.addMenuLine(eventId, recipe.productId, quantity);
        } else if (before !== quantity) {
          await this.events.setMenuLineQuantity(eventId, recipe.productId, quantity);
        }
      }

      const error = this.events.menuError();
      this.toast.show(
        error
          ? { type: 'error', title: 'Enregistrement refusé', message: error }
          : {
              type: 'success',
              title: 'Menu enregistré',
              message: `${this.totalSelected()} recettes · ${this.totalPortions()} portions`,
            },
      );
    } finally {
      this.saving.set(false);
    }

    this.close();
    void this.router.navigate(['/logistique', eventId]);
  }

  protected close(): void {
    this.modalService.close(this.id());
  }

  protected fmt(v: number): string {
    return v.toFixed(2).replace('.', ',');
  }
}

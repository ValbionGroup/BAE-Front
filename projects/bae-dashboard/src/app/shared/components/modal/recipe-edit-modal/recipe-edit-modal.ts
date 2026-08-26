import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  LucideChefHat,
  LucideChevronDown,
  LucideChevronUp,
  LucidePlus,
  LucideTrash2,
} from '@lucide/angular';
import { Btn, Field, Input, Toggle, ToastService } from '@bae/ui';
import { RecipesStore } from '#core/store/recipes.store';
import { StocksStore } from '#core/store/stocks.store';
import { ReferentielsStore } from '#core/store/referentiels.store';
import type { RecipeWritePayload } from '#pages/authed/recettes/recipes.types';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Une ligne de composition en cours de saisie. Tout y est `string` parce que
 * c'est ce que rendent les contrôles ; la conversion n'a lieu qu'à l'envoi.
 *
 * `key` existe parce que `goodId` ne peut pas servir de clé de suivi : il est
 * vide sur une ligne qu'on vient d'ajouter, et transitoirement dupliqué le
 * temps que l'utilisateur corrige un doublon.
 */
interface IngredientLine {
  readonly key: string;
  readonly goodId: string;
  readonly quantity: string;
  readonly instruction: string;
}

/**
 * Une recette consomme une fraction d'unité d'achat : `0,0833` paquet de pains
 * pour un hot-dog. La virgule est acceptée autant que le point.
 */
function parseQuantity(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (!/^\d*\.?\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function emptyToNull(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Création et édition d'une recette, entête et composition.
 *
 * L'écran ne peut pas se contenter de la ligne déjà affichée dans la liste :
 * `GET /products/summary` ne renvoie ni `description` ni `recipe`, et
 * enregistrer un formulaire pré-rempli à partir d'elle effacerait ces deux
 * colonnes. La modale relit donc `GET /products/:id` et ses ingrédients.
 *
 * Le catalogue d'ingrédients vient de `StocksStore` plutôt que d'un appel
 * dédié : c'est la même liste de `goods`, déjà chargée et mise en cache par la
 * page Stocks, et `load()` est gardé côté store.
 */
@Component({
  selector: 'bfd-recipe-edit-modal',
  imports: [Btn, Field, Input, Toggle, ModalShell],
  templateUrl: './recipe-edit-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeEditModal {
  readonly id = input.required<string>();
  /** `null` en création. */
  readonly recipeId = input<number | null>(null);
  /**
   * Prévient l'appelant de la recette écrite. La page s'en sert pour
   * sélectionner la nouvelle recette et recharger le panneau de détail, que
   * `RecipesStore.refresh()` ne touche pas : les ingrédients affichés viennent
   * d'un second endpoint.
   */
  readonly saved = input<((recipeId: number) => void) | null>(null);

  private readonly modalService = inject(ModalService);
  private readonly toast = inject(ToastService);
  protected readonly store = inject(RecipesStore);
  protected readonly stocks = inject(StocksStore);
  /** Alimente le sélecteur de catégorie de vente. */
  protected readonly referentiels = inject(ReferentielsStore);

  protected readonly icChef = LucideChefHat;
  protected readonly icPlus = LucidePlus;
  protected readonly icTrash = LucideTrash2;
  protected readonly icUp = LucideChevronUp;
  protected readonly icDown = LucideChevronDown;

  protected readonly isEdit = computed(() => this.recipeId() !== null);

  protected readonly name = signal('');
  protected readonly isVegetarian = signal(false);
  protected readonly description = signal('');
  protected readonly method = signal('');
  protected readonly lines = signal<readonly IngredientLine[]>([]);

  /** `''` = « Sans catégorie ». Une recette non classée est un cas normal. */
  protected readonly categoryId = signal<string>('');

  protected onCategoryId(value: string): void {
    this.categoryId.set(value);
  }

  protected readonly detailLoading = signal(false);
  protected readonly detailError = signal(false);

  /** Les erreurs de champ ne s'affichent qu'après une tentative d'envoi. */
  protected readonly submitted = signal(false);

  constructor() {
    this.store.clearSaveError();
    void this.stocks.load();
    // ⚠️ Charge les **quatre** listes de référence, dont une seule sert ici. Le
    // store est `providedIn: 'root'` et `load()` est gardé : une fois chargé, la
    // modale suivante ne redemande rien.
    void this.referentiels.load();

    effect(() => {
      const id = this.recipeId();
      if (id === null) return;
      this.detailLoading.set(true);
      this.detailError.set(false);
      void Promise.all([this.store.getDetail(id), this.store.getIngredients(id)])
        .then(([detail, ingredients]) => {
          this.name.set(detail.name);
          this.isVegetarian.set(detail.isVegetarian ?? false);
          this.description.set(detail.description ?? '');
          this.method.set(detail.recipe ?? '');
          this.categoryId.set(
            detail.productCategoryId === null ? '' : String(detail.productCategoryId),
          );
          this.lines.set(
            ingredients.map((ingredient) => ({
              key: crypto.randomUUID(),
              goodId: String(ingredient.id),
              quantity: ingredient.quantity === null ? '' : String(ingredient.quantity),
              instruction: ingredient.instruction ?? '',
            })),
          );
          this.detailLoading.set(false);
        })
        .catch(() => {
          this.detailLoading.set(false);
          this.detailError.set(true);
        });
    });
  }

  /**
   * Forme numérique de `categoryId()`, pour le `[selected]` de chaque `<option>`
   * — les gabarits Angular ne peuvent pas appeler `Number(...)` directement.
   */
  protected readonly categoryIdNumber = computed(() => {
    const raw = this.categoryId();
    return raw === '' ? null : Number(raw);
  });

  /** Même office pour les lignes d'ingrédients, dont le `goodId` est une chaîne. */
  protected sameGood(lineGoodId: string, goodId: number): boolean {
    return lineGoodId !== '' && Number(lineGoodId) === goodId;
  }

  protected onName(value: string): void {
    this.name.set(value);
  }
  protected onVegetarian(value: boolean): void {
    this.isVegetarian.set(value);
  }
  protected onDescription(event: Event): void {
    this.description.set((event.target as HTMLTextAreaElement).value);
  }
  protected onMethod(event: Event): void {
    this.method.set((event.target as HTMLTextAreaElement).value);
  }

  protected addLine(): void {
    this.lines.update((lines) => [
      ...lines,
      { key: crypto.randomUUID(), goodId: '', quantity: '1', instruction: '' },
    ]);
  }

  protected removeLine(key: string): void {
    this.lines.update((lines) => lines.filter((line) => line.key !== key));
  }

  /** `delta` vaut -1 ou +1 : l'ordre des lignes *est* l'ordre d'assemblage,
   *  que le back transforme en `rank`. */
  protected moveLine(key: string, delta: number): void {
    this.lines.update((lines) => {
      const index = lines.findIndex((line) => line.key === key);
      const target = index + delta;
      if (index === -1 || target < 0 || target >= lines.length) return lines;
      const next = [...lines];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  protected setGood(key: string, goodId: string): void {
    this.patchLine(key, { goodId });
  }
  protected setQuantity(key: string, quantity: string): void {
    this.patchLine(key, { quantity });
  }
  protected setInstruction(key: string, instruction: string): void {
    this.patchLine(key, { instruction });
  }

  private patchLine(key: string, patch: Partial<IngredientLine>): void {
    this.lines.update((lines) =>
      lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  /** Unité du produit choisi, affichée en suffixe de la quantité — sans elle
   *  « 3 » ne dit pas si l'on parle de pièces ou de kilos. */
  protected unitOf(goodId: string): string | null {
    if (goodId === '') return null;
    return this.stocks.products().find((p) => p.id === Number(goodId))?.unit ?? null;
  }

  /**
   * La clé primaire du pivot est `(product_id, good_id)` : deux fois le même
   * produit est un refus côté API, autant le dire avant l'envoi.
   */
  protected readonly duplicateGoodIds = computed(() => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const line of this.lines()) {
      if (line.goodId === '') continue;
      if (seen.has(line.goodId)) duplicates.add(line.goodId);
      seen.add(line.goodId);
    }
    return duplicates;
  });

  protected lineInvalid(line: IngredientLine): boolean {
    return (
      line.goodId === '' ||
      parseQuantity(line.quantity) === null ||
      this.duplicateGoodIds().has(line.goodId)
    );
  }

  /** Une recette sans ingrédient reste valide : on peut poser l'entête d'abord
   *  et composer ensuite. */
  protected readonly valid = computed(
    () => this.name().trim() !== '' && this.lines().every((line) => !this.lineInvalid(line)),
  );

  protected readonly goodsMissing = computed(() => this.stocks.products().length === 0);

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (!this.valid() || this.detailLoading()) return;

    const payload: RecipeWritePayload = {
      name: this.name().trim(),
      isVegetarian: this.isVegetarian(),
      description: emptyToNull(this.description()),
      recipe: emptyToNull(this.method()),
      // Chaîne vide = « Sans catégorie » : la colonne est nullable et
      // `productValidator` refuserait une chaîne.
      productCategoryId: this.categoryId() === '' ? null : Number(this.categoryId()),
      goods: this.lines().map((line) => ({
        goodId: Number(line.goodId),
        // `parseQuantity`, pas `Number` : la virgule décimale donnerait `NaN`.
        quantity: parseQuantity(line.quantity)!,
        instruction: emptyToNull(line.instruction),
      })),
    };

    const id = this.recipeId();
    const savedId =
      id === null
        ? await this.store.createRecipe(payload)
        : (await this.store.updateRecipe(id, payload))
          ? id
          : null;

    if (savedId === null) return;
    this.saved()?.(savedId);
    this.toast.show({
      type: 'success',
      title: id === null ? 'Recette créée' : 'Recette enregistrée',
      message: `${payload.name} · ${payload.goods.length} ingrédient${payload.goods.length !== 1 ? 's' : ''}.`,
    });
    this.modalService.close(this.id());
  }

  protected cancel(): void {
    this.modalService.close(this.id());
  }
}

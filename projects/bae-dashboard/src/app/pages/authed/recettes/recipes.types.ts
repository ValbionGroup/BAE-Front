export interface RecipeIngredient {
  readonly id: number;
  readonly name: string;
  readonly unit: string;
  readonly brand: string | null;
  /** Nom de la catégorie du produit, tel que renvoyé par l'API. */
  readonly category: string | null;
  readonly stockQty: number;
  readonly rank: number;
  readonly quantity: number | null;
  readonly unitPrice: number | null;
  readonly instruction: string | null;
}

export interface RecipeProduct {
  readonly id: number;
  readonly name: string;
  readonly isVegetarian: boolean;
  readonly category: string | null;
  readonly ingredientCount: number;
  /** Centimes. Dernier prix de vente connu, `null` si jamais vendu. */
  readonly lastPrice: number | null;
  /** Centimes, arrondis par le serveur — même unité que `lastPrice`, donc
   *  `lastPrice - cost` est une marge juste. Ce ne l'était pas : `cost` venait
   *  des prix fournisseurs décimaux, donc en euros. */
  readonly cost: number | null;
}

/**
 * Une ligne de composition à écrire. Pas de `rank` : la position dans le
 * tableau *est* l'ordre d'assemblage, et c'est elle que le back transforme en
 * rang. Un rang transmis explicitement pourrait arriver dupliqué ou troué.
 *
 * `quantity` est un entier : `product_goods.quantity` est une colonne
 * `integer unsigned`, donc une quantité fractionnaire est refusée par l'API.
 */
export interface RecipeIngredientInput {
  readonly goodId: number;
  readonly quantity: number;
  readonly instruction: string | null;
}

/**
 * Corps de `POST /products` et `PUT /products/:id`.
 *
 * `goods` est toujours envoyé par l'écran, y compris vide : omettre la clé
 * signifie « ne touche pas à la composition », ce qui n'est jamais ce que veut
 * un formulaire qui vient d'afficher la liste complète.
 */
export interface RecipeWritePayload {
  readonly name: string;
  readonly isVegetarian: boolean;
  readonly description: string | null;
  readonly recipe: string | null;
  readonly goods: readonly RecipeIngredientInput[];
}

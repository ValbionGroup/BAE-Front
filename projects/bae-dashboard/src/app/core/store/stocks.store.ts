import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { forkJoin, lastValueFrom } from 'rxjs';
import {
  StocksService,
  type ApiCategory,
  type ApiStockItem,
  type CreateGoodPayload,
  type ApiGoodDetail,
  type ApiNamedRef,
  type ApiStorageLocation,
} from '#core/services/stocks/stocks-service';
import type { LoadingStatus } from '#core/models/global.model';
import { messageOf, parseApiDate, settle } from '@bae/ui';
import type { DlcStatus, StockBatchRow, StockProduct } from '#pages/authed/stocks/stocks.types';

/** La borne compte : une DLC du jour même n'est pas encore périmée. */
function dlcStatus(expirationDate: string | null, today: Date): DlcStatus {
  if (!expirationDate) return 'none';
  const exp = parseApiDate(expirationDate);
  const diffDays = (exp.getTime() - today.getTime()) / 86_400_000;
  if (diffDays < 0) return 'expired';
  if (diffDays <= 7) return 'soon';
  return 'ok';
}

function toStockProduct(item: ApiStockItem): StockProduct {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nearestDlcStatus = dlcStatus(item.nearestExpirationDate, today);
  const nearestDlc = item.nearestExpirationDate
    ? parseApiDate(item.nearestExpirationDate).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      })
    : null;

  return {
    id: item.id,
    name: item.name,
    unit: item.unit,
    brand: item.brand,
    categoryId: item.categoryId,
    categoryName: item.category ?? '—',
    totalQty: item.totalRemainingQty,
    batchCount: item.batchCount,
    nearestDlc,
    nearestDlcStatus,
    expiredBatchCount: item.expiredBatchCount,
    soonBatchCount: item.soonBatchCount,
    storageLocationId: item.storageLocationId ?? null,
    storageLocationName: item.storageLocation ?? null,
  };
}

/**
 * `GET /stocks` trie par nom et le tableau en dépend : un ajout en fin de liste
 * mettrait « Bière » après « Vaisselle » jusqu'au prochain rechargement.
 */
function insertByName(products: readonly StockProduct[], product: StockProduct): StockProduct[] {
  const index = products.findIndex((entry) => entry.name.localeCompare(product.name, 'fr') > 0);
  return index === -1
    ? [...products, product]
    : [...products.slice(0, index), product, ...products.slice(index)];
}

interface StocksState {
  loading: LoadingStatus;
  loadError: string | null;
  products: StockProduct[];
  /** Catégories du sélecteur de création. Vide si l'endpoint a échoué : ce
   *  n'est pas une raison de vider la page, seulement d'empêcher la saisie. */
  categories: ApiCategory[];
  /** Lieux du sélecteur d'emplacement. Vide si l'endpoint a échoué **ou si le
   *  droit manque** : l'emplacement reste lisible, il n'est plus modifiable. */
  storageLocations: ApiStorageLocation[];
  creatingGood: boolean;
  createError: string | null;
}

const initialState: StocksState = {
  loading: 'init',
  loadError: null,
  products: [],
  categories: [],
  storageLocations: [],
  creatingGood: false,
  createError: null,
};

export const StocksStore = signalStore(
  { providedIn: 'root' },
  withState<StocksState>(initialState),
  withMethods((store, svc = inject(StocksService)) => ({
    async load(): Promise<void> {
      if (store.loading() === 'loaded' || store.loading() === 'loading') return;
      patchState(store, { loading: 'loading', loadError: null });
      try {
        // Catégories et lieux ne servent qu'aux sélecteurs : leur panne ne doit
        // pas emporter le tableau. Les lieux sont en plus gardés par une
        // permission que tout magasinier ne porte pas — un 403 est ici une
        // réponse normale, pas un incident.
        const [items, categories, storageLocations] = await lastValueFrom(
          forkJoin([svc.getAll(), settle(svc.getCategories()), settle(svc.getStorageLocations())]),
        );
        patchState(store, {
          loading: 'loaded',
          products: items.map(toStockProduct),
          categories: categories.ok ? categories.value : [],
          storageLocations: storageLocations.ok ? storageLocations.value : [],
        });
      } catch {
        patchState(store, { loading: 'error', loadError: 'Impossible de charger les stocks.' });
      }
    },

    /**
     * Non optimiste : pas d'id avant la réponse, et la liste est triée. Le
     * produit naît sans lot — c'est un réassort qui lui donnera du stock.
     */
    async createGood(payload: CreateGoodPayload): Promise<StockProduct | null> {
      if (store.creatingGood()) return null;
      patchState(store, { creatingGood: true, createError: null });

      try {
        const created = await lastValueFrom(svc.createGood(payload));
        const product: StockProduct = {
          id: created.id,
          name: created.name,
          unit: created.unit,
          brand: created.brand,
          categoryId: created.categoryId,
          categoryName: store.categories().find((c) => c.id === created.categoryId)?.name ?? '—',
          totalQty: 0,
          batchCount: 0,
          nearestDlc: null,
          nearestDlcStatus: 'none',
          expiredBatchCount: 0,
          soonBatchCount: 0,
          storageLocationId: created.storageLocationId ?? null,
          storageLocationName:
            store.storageLocations().find((l) => l.id === created.storageLocationId)?.name ?? null,
        };
        patchState(store, { products: insertByName(store.products(), product) });
        // Rendu à l'appelant : le scanner en a besoin pour rattacher la ligne
        // qui vient d'être créée, qui sans cela resterait « à créer ».
        return product;
      } catch (error) {
        patchState(store, { createError: messageOf(error, 'Impossible de créer ce produit.') });
        return null;
      } finally {
        patchState(store, { creatingGood: false });
      }
    },

    /**
     * Signale où se range une denrée, depuis le panneau de détail.
     *
     * **Pas optimiste.** Le produit n'est patché qu'après l'accord du serveur :
     * afficher « Frigo » sur un refus laisserait une valeur fausse à l'écran
     * jusqu'au prochain rechargement, et le sélecteur n'a rien qui la démente.
     * Un seul produit change, donc pas de `refresh()` : relire tout le stock
     * pour un `<select>` serait disproportionné.
     *
     * ⚠️ Le **nom** est résolu ici, depuis la liste déjà chargée, et non relu au
     * serveur : `GET /stocks` est le seul endpoint qui le rend, et le rappeler
     * pour un libellé coûterait tout le catalogue.
     */
    async setStorageLocation(id: number, storageLocationId: number | null): Promise<boolean> {
      try {
        await lastValueFrom(svc.updateGoodStorageLocation(id, storageLocationId));
        const storageLocationName =
          store.storageLocations().find((l) => l.id === storageLocationId)?.name ?? null;
        patchState(store, {
          products: store
            .products()
            .map((product) =>
              product.id === id ? { ...product, storageLocationId, storageLocationName } : product,
            ),
        });
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Supprime des denrées, **en séquence** : un refus ne doit pas emporter les
     * suivantes — même patron que la validation du scanner. Un seul `refresh()`
     * à la fin : deux suppressions ne justifient pas deux relectures de la liste.
     *
     * ⚠️ La cascade côté base emporte les lots, leur historique, les tarifs, les
     * codes-barres et la ligne de la denrée dans chaque recette. L'API ne
     * refuse rien : l'avertissement appartient à l'écran, pas à ce store.
     */
    async deleteGoods(ids: readonly number[]): Promise<{ deleted: number; error: unknown | null }> {
      let deleted = 0;
      let error: unknown | null = null;

      for (const id of ids) {
        try {
          await lastValueFrom(svc.deleteGood(id));
          deleted += 1;
        } catch (caught) {
          error = caught;
        }
      }

      await this.refresh();
      return { deleted, error };
    },

    /**
     * Les recettes qu'une suppression amputerait, nommées et dédupliquées.
     *
     * `complete` à `false` quand une fiche n'a pas pu être lue : l'écran le dit
     * plutôt que de taire un risque, et laisse quand même supprimer — ne pas
     * pouvoir lire les recettes ne doit pas bloquer un ménage.
     */
    async getGoodUsage(
      ids: readonly number[],
    ): Promise<{ recipeNames: readonly string[]; complete: boolean }> {
      const names: string[] = [];
      let complete = true;

      const details = await Promise.all(ids.map((id) => lastValueFrom(settle(svc.getGood(id)))));
      for (const detail of details) {
        if (!detail.ok) {
          complete = false;
          continue;
        }
        for (const product of detail.value.products ?? []) {
          if (!names.includes(product.name)) names.push(product.name);
        }
      }

      return { recipeNames: names, complete };
    },

    /** Rechargement explicite : `load()` sortirait aussitôt, l'état étant
     *  déjà `loaded`. */
    async refresh(): Promise<void> {
      try {
        const [items, categories, storageLocations] = await lastValueFrom(
          forkJoin([svc.getAll(), settle(svc.getCategories()), settle(svc.getStorageLocations())]),
        );
        patchState(store, {
          products: items.map(toStockProduct),
          categories: categories.ok ? categories.value : store.categories(),
          // ⚠️ Relus ici et pas seulement au premier chargement : `load()` sort
          // tôt une fois `loaded`, donc un lieu créé depuis Référentiels
          // n'apparaîtrait au sélecteur qu'après un F5.
          storageLocations: storageLocations.ok ? storageLocations.value : store.storageLocations(),
        });
      } catch {
        patchState(store, { loadError: 'Impossible de recharger les stocks.' });
      }
    },

    /**
     * Entre un lot en stock — l'ajout **sans code-barres**, celui de la modale
     * d'entrée manuelle comme celui du scanner.
     *
     * Le `refresh()` n'est pas décoratif : la page affiche des agrégats par
     * denrée (`totalQty`, `batchCount`, les KPIs), que le POST ne renvoie pas.
     * Sans lui, le lot existe en base et le tableau montre les quantités d'avant.
     */
    async createBatch(payload: {
      goodId: number;
      quantity: number;
      expirationDate: string | null;
    }): Promise<{ ok: true } | { ok: false; error: unknown }> {
      try {
        await lastValueFrom(svc.createBatch(payload));
        await this.refresh();
        return { ok: true };
      } catch (error) {
        return { ok: false, error };
      }
    },

    /** Sortie partielle d'un lot. Le refus voyage dans la valeur résolue —
     *  patron de `setSupplierPrice` — pour que l'écran montre pourquoi. */
    async removeFromBatch(payload: {
      goodId: number;
      stockBatchId: number;
      quantity: number;
    }): Promise<{ ok: true } | { ok: false; error: unknown }> {
      try {
        await lastValueFrom(svc.removeFromBatch(payload));
        await this.refresh();
        return { ok: true };
      } catch (error) {
        return { ok: false, error };
      }
    },

    async discardBatch(goodsId: number, batchId: number, remainingQty: number): Promise<void> {
      await lastValueFrom(svc.discardBatch(goodsId, batchId, remainingQty));
      const items = await lastValueFrom(svc.getAll());
      patchState(store, { products: items.map(toStockProduct) });
    },

    async getBatches(goodsId: number, showEmpty = false): Promise<StockBatchRow[]> {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const raw = await lastValueFrom(svc.getBatches(goodsId, showEmpty));
      return raw.map((b) => ({
        id: b.id,
        restockId: b.restockId,
        label: b.label,
        initialQty: b.initialQty,
        remainingQty: b.remainingQty,
        dlcLabel: b.expirationDate
          ? parseApiDate(b.expirationDate).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
            })
          : null,
        dlcStatus: dlcStatus(b.expirationDate, today),
        openedAt: b.openedAt
          ? parseApiDate(b.openedAt).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
            })
          : null,
      }));
    },

    /**
     * Les tarifs d'une denrée. Non stockés dans l'état : le panneau de détail
     * est ouvert sur **une** denrée à la fois, et les mémoriser toutes ferait
     * vieillir des prix que personne ne regarde — même raison que `getBatches`.
     */
    async getSupplierPrices(goodId: number): Promise<ApiGoodDetail | null> {
      try {
        return await lastValueFrom(svc.getGood(goodId));
      } catch {
        return null;
      }
    },

    async listSuppliers(): Promise<readonly ApiNamedRef[]> {
      try {
        return await lastValueFrom(svc.getSuppliers());
      } catch {
        return [];
      }
    },

    /**
     * ⚠️ `priceCents` est en **centimes** : la conversion depuis les euros
     * saisis appartient à l'écran, par `parseEuros`. Le refus voyage dans la
     * valeur résolue — patron d'`EventsStore`, pour qu'un 403 ou un 404 soit
     * montré plutôt qu'avalé.
     */
    async setSupplierPrice(
      goodId: number,
      supplierId: number,
      priceCents: number,
    ): Promise<{ ok: true } | { ok: false; error: unknown }> {
      try {
        await lastValueFrom(svc.setSupplierPrice(goodId, supplierId, priceCents));
        return { ok: true };
      } catch (error) {
        return { ok: false, error };
      }
    },

    async removeSupplierPrice(
      goodId: number,
      supplierId: number,
    ): Promise<{ ok: true } | { ok: false; error: unknown }> {
      try {
        await lastValueFrom(svc.removeSupplierPrice(goodId, supplierId));
        return { ok: true };
      } catch (error) {
        return { ok: false, error };
      }
    },
  })),
);

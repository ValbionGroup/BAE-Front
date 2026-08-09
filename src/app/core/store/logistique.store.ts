import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { forkJoin, lastValueFrom } from 'rxjs';
import { LogistiqueService } from '#core/services/logistique/logistique-service';
import type { LoadingStatus } from '#core/models/global.model';
import { messageOf, settle } from '#shared/utils/api-error';
import type {
  ApiGood,
  ApiSupplier,
  ApiVoucher,
  CreateVoucherPayload,
  VoucherCard,
} from '#pages/authed/logistique/logistique.types';

/**
 * Formats a `YYYY-MM-DD` DATE as `DD/MM/YYYY`.
 *
 * Parsed by hand rather than through `new Date(...)`: a bare date string is
 * read as UTC midnight, which shifts to the previous day for any negative
 * offset. The wire value carries no time, so no timezone maths should apply.
 */
function formatIsoDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function toVoucherCard(voucher: ApiVoucher): VoucherCard {
  return {
    id: voucher.id,
    supplierName: voucher.supplier?.name ?? 'Enseigne non précisée',
    value: voucher.value,
    expiresLabel: formatIsoDate(voucher.expiresAt),
    expiresAt: voucher.expiresAt,
    condition: voucher.condition,
    daysUntilExpiry: voucher.daysUntilExpiry,
    // Server-computed flags, used as-is: the 7-day window is a business rule
    // shared with the stocks page and must not be re-derived here.
    used: voucher.used,
    expired: voucher.expired,
    warn: voucher.warn,
  };
}

/**
 * Insère un bon à sa place dans l'ordre d'expiration croissante.
 *
 * `GET /vouchers` renvoie les bons triés (`orderBy('expiresAt', 'asc')`) et le
 * panneau en dépend : les bons urgents sont en tête. Un simple ajout en fin de
 * liste placerait un bon expirant dans trois jours derrière ceux qui expirent
 * dans six mois.
 *
 * La comparaison est lexicographique et c'est suffisant : `YYYY-MM-DD` est
 * ordonné par construction, et la colonne est `NOT NULL` donc il n'y a aucun
 * cas nul à ventiler.
 */
function insertByExpiry(cards: readonly VoucherCard[], card: VoucherCard): VoucherCard[] {
  const index = cards.findIndex((entry) => entry.expiresAt > card.expiresAt);
  return index === -1 ? [...cards, card] : [...cards.slice(0, index), card, ...cards.slice(index)];
}

interface LogistiqueState {
  loading: LoadingStatus;
  loadError: string | null;
  goods: ApiGood[];
  vouchers: VoucherCard[];
  suppliers: ApiSupplier[];
  /** Vrai quand l'API a refusé la lecture des bons (403). Distinct d'une
   *  panne : c'est une règle, pas un incident. */
  vouchersForbidden: boolean;
  /** Message d'une panne de la seule branche « bons ». Ne pas confondre avec
   *  `voucherError`, qui porte l'échec d'une écriture sur une carte précise. */
  vouchersLoadError: string | null;
  /** Verrou par bon : empêche deux écritures concurrentes sur la même ligne. */
  savingVoucherIds: number[];
  /** Erreur d'une carte, et le bon qu'elle concerne. */
  voucherError: string | null;
  voucherErrorId: number | null;
  /** Erreur de la modale de création — délibérément distincte de la
   *  précédente : un refus de création ne doit pas s'afficher sur une carte. */
  creatingVoucher: boolean;
  createError: string | null;
}

const initialState: LogistiqueState = {
  loading: 'init',
  loadError: null,
  goods: [],
  vouchers: [],
  suppliers: [],
  vouchersForbidden: false,
  vouchersLoadError: null,
  savingVoucherIds: [],
  voucherError: null,
  voucherErrorId: null,
  creatingVoucher: false,
  createError: null,
};

export const LogistiqueStore = signalStore(
  { providedIn: 'root' },
  withState<LogistiqueState>(initialState),
  withMethods((store, svc = inject(LogistiqueService)) => {
    /**
     * Unguarded fetch. `load()` wraps it behind the idempotence guard;
     * `refresh()` calls it directly so an explicit reload always hits the API.
     */
    async function fetch(status: LoadingStatus): Promise<void> {
      patchState(store, { loading: status, loadError: null });
      try {
        // Seule la branche des bons est isolée : si le catalogue tombe, il ne
        // reste aucune page à montrer et `loadError` est la bonne réponse.
        const [goods, vouchers, suppliers] = await lastValueFrom(
          forkJoin([svc.getGoods(), settle(svc.getVouchers()), svc.getSuppliers()]),
        );
        patchState(store, {
          loading: 'loaded',
          goods,
          vouchers: vouchers.ok ? vouchers.value.map(toVoucherCard) : [],
          suppliers,
          vouchersForbidden: !vouchers.ok && vouchers.status === 403,
          vouchersLoadError:
            vouchers.ok || vouchers.status === 403
              ? null
              : "Impossible de charger les bons d'achat.",
        });
      } catch {
        patchState(store, {
          loading: 'error',
          loadError: 'Impossible de charger la logistique.',
        });
      }
    }

    return {
      /** Called from the page's `ngOnInit`; a no-op once the data is in. */
      async load(): Promise<void> {
        if (store.loading() === 'loaded' || store.loading() === 'loading') return;
        await fetch('loading');
      },

      /**
       * Explicit reload that bypasses the `load()` guard. Uses `refreshing` so
       * the page keeps showing the current data instead of flashing skeletons.
       */
      async refresh(): Promise<void> {
        await fetch('refreshing');
      },

      /**
       * Non optimiste : il n'y a pas d'id avant la réponse, et un id fantôme
       * dans une liste triée coûterait plus qu'il ne rapporte — créer un bon
       * est un geste rare et délibéré.
       *
       * Renvoie `true` sur succès, ce qui est ce dont la modale a besoin pour
       * décider de se fermer.
       */
      async createVoucher(payload: CreateVoucherPayload): Promise<boolean> {
        if (store.creatingVoucher()) return false;
        patchState(store, { creatingVoucher: true, createError: null });

        try {
          const created = await lastValueFrom(svc.createVoucher(payload));
          patchState(store, {
            vouchers: insertByExpiry(store.vouchers(), toVoucherCard(created)),
          });
          return true;
        } catch (error) {
          patchState(store, {
            createError: messageOf(error, "Impossible de créer ce bon d'achat."),
          });
          return false;
        } finally {
          patchState(store, { creatingVoucher: false });
        }
      },

      /**
       * Bascule optimiste : le badge doit suivre le clic, pas le réseau.
       *
       * Seul le booléen `used` est basculé localement. `expired` et `warn` sont
       * calculés côté serveur et restent donc périmés le temps du vol — sans
       * conséquence visible, vérifié sur les trois consommateurs : le badge
       * teste `used` avant `warn`, `voucherToneClass` fait gagner
       * `used || expired`, et `usableVoucherTotal` filtre sur `!used`.
       * Un futur lecteur de `warn` ne peut donc pas s'y fier pendant une bascule.
       */
      async toggleVoucherUsed(id: number, used: boolean): Promise<void> {
        if (store.savingVoucherIds().includes(id)) return;

        if (store.voucherErrorId() === id) {
          patchState(store, { voucherError: null, voucherErrorId: null });
        }

        const target = store.vouchers().find((entry) => entry.id === id);
        if (!target) {
          patchState(store, {
            voucherError: 'Ce bon a été supprimé entre-temps.',
            voucherErrorId: id,
          });
          return;
        }

        patchState(store, {
          vouchers: store.vouchers().map((v) => (v.id === id ? { ...v, used } : v)),
          savingVoucherIds: [...store.savingVoucherIds(), id],
        });

        try {
          const saved = await lastValueFrom(
            svc.setVoucherUsed(id, used ? new Date().toISOString() : null),
          );
          patchState(store, {
            vouchers: store.vouchers().map((v) => (v.id === id ? toVoucherCard(saved) : v)),
          });
        } catch (error) {
          // Cette ligne seule est restaurée, fusionnée dans l'état vivant : un
          // instantané global annulerait aussi une écriture concurrente aboutie
          // pendant que celle-ci était en vol.
          patchState(store, {
            vouchers: store.vouchers().map((v) => (v.id === id ? target : v)),
            voucherError: messageOf(error, "Impossible de mettre à jour ce bon d'achat."),
            voucherErrorId: id,
          });
        } finally {
          patchState(store, {
            savingVoucherIds: store.savingVoucherIds().filter((entry) => entry !== id),
          });
        }
      },
    };
  }),
);

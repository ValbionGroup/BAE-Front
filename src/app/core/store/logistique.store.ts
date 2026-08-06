import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { forkJoin, lastValueFrom } from 'rxjs';
import { LogistiqueService } from '#core/services/logistique/logistique-service';
import type { LoadingStatus } from '#core/models/global.model';
import type { ApiGood, ApiVoucher, VoucherCard } from '#pages/authed/logistique/logistique.types';

/**
 * Formats a `YYYY-MM-DD` DATE as `DD/MM/YYYY`.
 *
 * Parsed by hand rather than through `new Date(...)`: a bare date string is
 * read as UTC midnight, which shifts to the previous day for any negative
 * offset. The wire value carries no time, so no timezone maths should apply.
 */
function formatIsoDate(value: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : null;
}

function toVoucherCard(voucher: ApiVoucher): VoucherCard {
  return {
    id: voucher.id,
    supplierName: voucher.supplier?.name ?? 'Enseigne non précisée',
    value: voucher.value,
    expiresLabel: formatIsoDate(voucher.expiresAt),
    condition: voucher.condition,
    daysUntilExpiry: voucher.daysUntilExpiry,
    // Server-computed flags, used as-is: the 7-day window is a business rule
    // shared with the stocks page and must not be re-derived here.
    used: voucher.used,
    expired: voucher.expired,
    warn: voucher.warn,
  };
}

interface LogistiqueState {
  loading: LoadingStatus;
  loadError: string | null;
  goods: ApiGood[];
  vouchers: VoucherCard[];
}

const initialState: LogistiqueState = {
  loading: 'init',
  loadError: null,
  goods: [],
  vouchers: [],
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
        const [goods, vouchers] = await lastValueFrom(
          forkJoin([svc.getGoods(), svc.getVouchers()]),
        );
        patchState(store, {
          loading: 'loaded',
          goods,
          vouchers: vouchers.map(toVoucherCard),
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
    };
  }),
);

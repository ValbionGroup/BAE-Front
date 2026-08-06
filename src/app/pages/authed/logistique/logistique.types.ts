/**
 * Types for the "Logistique" page (shopping list + vouchers).
 *
 * The `Api*` shapes are what the HTTP layer hands over *after*
 * `apiResponseCaseInterceptor` has camelCased the snake_case wire payload and
 * `apiEnvelopeInterceptor` has unwrapped `{ data }`.
 */

/** One supplier's price for a given good (the `good_suppliers.price` pivot). */
export interface ApiSupplierPrice {
  readonly id: number;
  readonly name: string;
  readonly price: number;
}

/** `GET /goods` — `suppliers` is sorted cheapest-first by the API. */
export interface ApiGood {
  readonly id: number;
  readonly name: string;
  readonly unit: string;
  readonly brand: string | null;
  readonly categoryId: number | null;
  readonly category: { readonly id: number; readonly name: string } | null;
  readonly suppliers: readonly ApiSupplierPrice[];
  /** `null` when no supplier prices this good. */
  readonly bestSupplier: ApiSupplierPrice | null;
  readonly bestPrice: number | null;
}

/**
 * `GET /vouchers` — ordered soonest-expiry-first.
 *
 * `expired` / `warn` / `used` are computed *server-side* on purpose: the
 * 7-day "expiring soon" window is a business rule shared with the stocks page
 * and must not be re-derived from the browser clock.
 */
export interface ApiVoucher {
  readonly id: number;
  readonly supplierId: number | null;
  readonly supplier: { readonly id: number; readonly name: string } | null;
  readonly value: number;
  /** `YYYY-MM-DD` — a DATE, not a datetime. */
  readonly expiresAt: string | null;
  readonly condition: string | null;
  readonly usedAt: string | null;
  readonly used: boolean;
  readonly daysUntilExpiry: number | null;
  readonly expired: boolean;
  readonly warn: boolean;
}

/**
 * One dynamically-derived retailer column. The set is built from the suppliers
 * that actually appear in the loaded goods — there are no hardcoded retailers.
 */
export interface SupplierColumn {
  readonly id: number;
  readonly name: string;
  /** How many of the loaded goods this supplier prices — drives column order. */
  readonly coverage: number;
}

/** One price cell, positionally aligned with `SupplierColumn[]`. */
export interface CartCell {
  readonly supplierId: number;
  /** `null` when this supplier does not price this good. */
  readonly price: number | null;
  readonly isBest: boolean;
}

/** One shopping-list row. `cells` is always the same length as the column set. */
export interface CartRow {
  readonly id: number;
  readonly name: string;
  readonly unit: string;
  readonly brand: string | null;
  readonly categoryName: string;
  readonly cells: readonly CartCell[];
  readonly bestSupplierName: string | null;
  readonly bestPrice: number | null;
}

/** Per-supplier column total over the selected rows. */
export interface SupplierTotal {
  readonly supplierId: number;
  /** Sum over the selected rows this supplier prices; `null` when it prices none. */
  readonly total: number | null;
  /** True when this supplier prices every selected row. */
  readonly fullCoverage: boolean;
}

/** A voucher ready for display. */
export interface VoucherCard {
  readonly id: number;
  readonly supplierName: string;
  readonly value: number;
  /** `DD/MM/YYYY`, or `null` when the voucher has no expiry date. */
  readonly expiresLabel: string | null;
  readonly condition: string | null;
  readonly daysUntilExpiry: number | null;
  readonly used: boolean;
  readonly expired: boolean;
  readonly warn: boolean;
}

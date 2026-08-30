import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge, Btn, Card, Skeleton, formatApiDate, formatCents } from '@bae/ui';

import { PurchasesStore } from '../../core/purchases.store';
import { SessionStore } from '../../core/session.store';
import { IdentityQr } from './components/identity-qr/identity-qr';
import { ProfileForm } from './components/profile-form/profile-form';

/** Une ligne d'aperçu, quelle que soit la source de l'achat. */
interface RecentPurchase {
  readonly key: string;
  readonly title: string;
  readonly subtitle: string;
  readonly totalCents: number;
  readonly createdAt: string | null;
}

const PREVIEW_SIZE = 3;

@Component({
  selector: 'bfp-profil',
  imports: [RouterLink, Badge, Btn, Card, Skeleton, IdentityQr, ProfileForm],
  templateUrl: './profil.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profil {
  protected readonly session = inject(SessionStore);
  protected readonly purchases = inject(PurchasesStore);

  constructor() {
    this.purchases.load();
  }

  /** « Pas encore su » n'est pas « pas de cotisation ». */
  protected readonly pending = computed(
    () =>
      this.session.status() === 'unknown' ||
      this.purchases.subscriptionsStatus() === 'init' ||
      this.purchases.subscriptionsStatus() === 'loading',
  );

  protected readonly recent = computed<readonly RecentPurchase[]>(() => {
    const fromCounter = this.purchases.orders().map((row) => ({
      key: `order-${row.id}`,
      title: row.eventName,
      subtitle: `Commande n°${row.number} · ${formatApiDate(row.createdAt)}`,
      totalCents: row.totalCents,
      createdAt: row.createdAt,
    }));

    const fromPreOrders = this.purchases.preOrders().map((row) => ({
      key: `pre-order-${row.id}`,
      title: row.eventName,
      subtitle: `${row.reference} · ${formatApiDate(row.createdAt)}`,
      totalCents: row.totalCents,
      createdAt: row.createdAt,
    }));

    return [...fromCounter, ...fromPreOrders]
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, PREVIEW_SIZE);
  });

  protected dateOf(iso: string | null): string {
    return formatApiDate(iso);
  }

  protected price(cents: number): string {
    return formatCents(cents);
  }
}

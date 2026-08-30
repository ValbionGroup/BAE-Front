import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon, LucideQrCode, LucideStore, LucideZap } from '@lucide/angular';
import {
  Badge,
  BadgeKind,
  Btn,
  Card,
  Skeleton,
  formatApiDate,
  formatCents,
  formatPickupSlot,
} from '@bae/ui';

import { PurchasesStore, type MySubscription } from '../../../core/purchases.store';
import { statusKind, statusLabel } from '../purchase-labels';

@Component({
  selector: 'bfp-profil-commandes',
  imports: [RouterLink, Badge, Btn, Card, Skeleton, LucideDynamicIcon],
  templateUrl: './commandes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Commandes {
  protected readonly store = inject(PurchasesStore);

  protected readonly icQr = LucideQrCode;
  protected readonly icZap = LucideZap;
  protected readonly icStore = LucideStore;

  constructor() {
    this.store.load();
  }

  protected readonly hasNothing = computed(
    () => this.store.status() === 'loaded' && this.store.isEmpty(),
  );

  protected badgeLabel(status: string): string {
    return statusLabel(status);
  }

  protected badgeKind(status: string): BadgeKind {
    return statusKind(status);
  }

  protected subscriptionKind(subscription: MySubscription): BadgeKind {
    return subscription.status === 'active' ? 'blue' : 'neutral';
  }

  protected subscriptionLabel(subscription: MySubscription): string {
    const expiry = formatApiDate(subscription.expiresAt);
    return subscription.status === 'active' ? `Actif · expire ${expiry}` : `Expiré le ${expiry}`;
  }

  protected dateOf(iso: string | null): string {
    return formatApiDate(iso);
  }

  /** L'heure de retrait choisie à la commande, telle que le client la relit. */
  protected pickupTime(iso: string): string {
    return formatPickupSlot(iso);
  }

  protected price(cents: number): string {
    return formatCents(cents);
  }

  /** Reçoit des **centimes**, comme `price()`. */
  protected euros(cents: number | null): string {
    return cents === null ? '—' : formatCents(cents);
  }
}

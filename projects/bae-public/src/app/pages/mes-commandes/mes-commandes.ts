import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LucideDynamicIcon, LucideQrCode, LucideZap } from '@lucide/angular';
import { Badge, BadgeKind, Btn, Card, Skeleton, formatCents, formatPickupSlot } from '@bae/ui';

import { PurchasesStore, type MyPreOrder, type MySubscription } from '../../core/purchases.store';

const STATUS_LABELS: Readonly<Record<string, string>> = {
  pending: 'Enregistrée',
  in_progress: 'En préparation',
  ready: 'Prête à retirer',
  completed: 'Retirée',
  cancelled: 'Annulée',
};

const STATUS_KINDS: Readonly<Record<string, BadgeKind>> = {
  pending: 'neutral',
  in_progress: 'blue',
  ready: 'warn',
  completed: 'ok',
  cancelled: 'danger',
};

@Component({
  selector: 'bfp-mes-commandes',
  imports: [RouterLink, Btn, Badge, Card, Skeleton, LucideDynamicIcon],
  templateUrl: './mes-commandes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MesCommandes {
  protected readonly store = inject(PurchasesStore);

  protected readonly icQr = LucideQrCode;
  protected readonly icZap = LucideZap;

  constructor() {
    this.store.load();
  }

  protected readonly hasNothing = computed(
    () => this.store.status() === 'loaded' && this.store.isEmpty(),
  );

  protected statusLabel(preOrder: MyPreOrder): string {
    return STATUS_LABELS[preOrder.status] ?? preOrder.status;
  }

  protected statusKind(preOrder: MyPreOrder): BadgeKind {
    return STATUS_KINDS[preOrder.status] ?? 'neutral';
  }

  protected subscriptionKind(subscription: MySubscription): BadgeKind {
    return subscription.status === 'active' ? 'blue' : 'neutral';
  }

  protected subscriptionLabel(subscription: MySubscription): string {
    const expiry = format(parseISO(subscription.expiresAt), 'dd/MM/yyyy', { locale: fr });
    return subscription.status === 'active' ? `Actif · expire ${expiry}` : `Expiré le ${expiry}`;
  }

  /**
   * `parseISO` et non `new Date` : ce dernier lit une date **sans heure** comme
   * de l'UTC, qu'il réaffiche en heure locale — un jour de moins à l'ouest de
   * Greenwich. Les horodatages complets sont traités pareil par les deux ; c'est
   * le format court qui les sépare.
   */
  protected dateOf(iso: string | null): string {
    if (iso === null) return '—';
    return format(parseISO(iso), 'dd/MM/yyyy', { locale: fr });
  }

  /** L'heure de retrait choisie à la commande, telle que le client la relit. */
  protected pickupTime(iso: string): string {
    return formatPickupSlot(iso);
  }

  protected price(cents: number): string {
    return formatCents(cents);
  }

  protected euros(amount: number | null): string {
    return amount === null ? '—' : amount.toFixed(2).replace('.', ',');
  }
}

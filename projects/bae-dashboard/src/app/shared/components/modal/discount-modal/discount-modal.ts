import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucideTicketPercent } from '@lucide/angular';
import { Btn, Field, Input, formatCents, parseEuros } from '@bae/ui';
import type { OrderDiscount } from '#core/services/orders/orders-service';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Les motifs courants du comptoir. Liste **ouverte** : « Autre » libère un champ
 * libre, parce qu'un cas imprévu ne doit jamais bloquer un encaissement un soir
 * de rush. Fermer la liste rendrait la donnée plus propre et la caisse
 * inutilisable.
 */
export const DISCOUNT_REASONS = [
  'Geste commercial',
  'Erreur de préparation',
  'Produit défectueux',
  'Fin de service',
] as const;

const OTHER = 'Autre';

@Component({
  selector: 'bfd-discount-modal',
  imports: [Btn, Field, Input, ModalShell],
  templateUrl: './discount-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscountModal {
  readonly id = input.required<string>();
  /** Le total du panier : la remise ne peut pas le dépasser. */
  readonly maxCents = input.required<number>();
  readonly current = input<OrderDiscount | null>(null);
  readonly applied = input<((discount: OrderDiscount | null) => void) | null>(null);

  protected readonly reasons = DISCOUNT_REASONS;
  protected readonly other = OTHER;
  protected readonly icTicket = LucideTicketPercent;
  protected readonly formatCents = formatCents;

  private readonly modalService = inject(ModalService);

  protected readonly amount = signal<string>('');
  protected readonly reason = signal<string>(DISCOUNT_REASONS[0]);
  protected readonly freeReason = signal<string>('');
  protected readonly submitted = signal(false);

  protected onAmount(v: string): void {
    this.amount.set(v);
  }
  protected onReason(v: string): void {
    this.reason.set(v);
  }
  protected onFreeReason(v: string): void {
    this.freeReason.set(v);
  }

  /** `parseEuros` est la seule frontière de conversion euros → centimes. */
  protected readonly amountCents = computed(() => parseEuros(this.amount()));

  protected readonly label = computed(() =>
    this.reason() === OTHER ? this.freeReason().trim() : this.reason(),
  );

  /**
   * Le plafond est dit à l'écran plutôt que corrigé en silence : le serveur
   * ramènerait la remise au dû, mais le comptoir annoncerait un autre montant
   * que le ticket.
   */
  protected readonly tooLarge = computed(
    () => this.amountCents() !== null && this.amountCents()! > this.maxCents(),
  );

  protected readonly valid = computed(
    () =>
      this.amountCents() !== null &&
      this.amountCents()! > 0 &&
      !this.tooLarge() &&
      this.label() !== '',
  );

  protected submit(): void {
    this.submitted.set(true);
    if (!this.valid()) return;

    this.applied()?.({ amountCents: this.amountCents()!, label: this.label() });
    this.modalService.close(this.id());
  }

  /** Retirer la remise est un geste à part entière, pas une saisie à zéro. */
  protected remove(): void {
    this.applied()?.(null);
    this.modalService.close(this.id());
  }

  protected cancel(): void {
    this.modalService.close(this.id());
  }
}

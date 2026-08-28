import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucideBoxes } from '@lucide/angular';
import { Btn, Field, Input, formatCents, messageOf, parseEuros } from '@bae/ui';
import { FurnituresStore } from '#core/store/furnitures.store';
import type { ApiFurniture } from '#core/services/furnitures/furnitures-service';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Saisie d'une fourniture — le non alimentaire du catalogue.
 *
 * Trois champs, et c'est toute la table : une fourniture n'a ni lot, ni DLC, ni
 * catégorie, ni tarif par enseigne. Son stock se corrige donc **en retapant le
 * nombre** ; il n'y a pas de mouvement à enregistrer, le serveur n'en tient pas
 * l'historique.
 *
 * ⚠️ `quantity` est un `integer unsigned` en base : une fraction y serait
 * arrondie en silence. Le prix, lui, se saisit en euros et part en centimes —
 * `parseEuros` est la seule frontière de conversion du front.
 */
@Component({
  selector: 'bfd-furniture-edit-modal',
  imports: [Btn, Field, Input, ModalShell],
  templateUrl: './furniture-edit-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FurnitureEditModal {
  readonly id = input.required<string>();
  /** `null` en création. */
  readonly furniture = input<ApiFurniture | null>(null);
  readonly onDone = input<() => void>(() => {});

  private readonly modalService = inject(ModalService);
  private readonly store = inject(FurnituresStore);

  protected readonly icBoxes = LucideBoxes;

  protected readonly name = signal('');
  protected readonly quantity = signal('');
  protected readonly amount = signal('');

  /** Les erreurs de champ ne s'affichent qu'après une tentative d'envoi. */
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly editing = computed(() => this.furniture() !== null);
  protected readonly title = computed(() =>
    this.editing() ? 'Modifier la fourniture' : 'Nouvelle fourniture',
  );

  constructor() {
    // ⚠️ Les `input()` ne sont pas encore posés à la construction. Lu une seule
    // fois, et non par un `effect` : le champ doit pouvoir être vidé sans qu'on
    // le remplisse à nouveau.
    queueMicrotask(() => {
      const current = this.furniture();
      if (!current) return;
      this.name.set(current.name);
      this.quantity.set(String(current.quantity));
      this.amount.set(formatCents(current.price));
    });
  }

  protected onName(value: string): void {
    this.name.set(value);
  }
  protected onQuantity(value: string): void {
    this.quantity.set(value);
  }
  protected onAmount(value: string): void {
    this.amount.set(value);
  }

  /** `null` sur une saisie illisible — zéro reste une quantité légitime : une
   *  fourniture en rupture ne quitte pas le catalogue. */
  protected readonly parsedQuantity = computed<number | null>(() => {
    const raw = this.quantity().trim();
    if (!/^\d+$/.test(raw)) return null;
    return Number(raw);
  });

  protected readonly cents = computed<number | null>(() => {
    const raw = this.amount().trim();
    if (raw === '') return null;
    return parseEuros(raw);
  });

  protected readonly valid = computed(
    () => this.name().trim() !== '' && this.parsedQuantity() !== null && this.cents() !== null,
  );

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    const quantity = this.parsedQuantity();
    const price = this.cents();
    if (!this.valid() || quantity === null || price === null || this.busy()) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      const input = { name: this.name().trim(), quantity, price };
      const current = this.furniture();
      const result = current
        ? await this.store.update(current.id, input)
        : await this.store.create(input);

      if (!result.ok) {
        this.error.set(messageOf(result.error, "L'enregistrement a échoué."));
        return;
      }
      this.onDone()();
      this.modalService.close(this.id());
    } finally {
      this.busy.set(false);
    }
  }

  protected cancel(): void {
    this.modalService.close(this.id());
  }
}

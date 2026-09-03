import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { LucideHandCoins } from '@lucide/angular';
import { Btn, formatCents, messageOf } from '@bae/ui';
import {
  SponsorshipsService,
  SPONSORSHIP_MODE_LABELS,
  type SponsorshipCategory,
} from '#core/services/sponsorships/sponsorships-service';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Applique une prise en charge **sans** le QR.
 *
 * Le QR reste la voie normale ; celle-ci existe pour le retardataire qui se
 * présente sans son exemplaire. N'écrit rien : le choix remonte à la caisse, et
 * c'est le serveur qui retarife à l'encaissement depuis le seul identifiant.
 */
@Component({
  selector: 'bfd-sponsorship-picker-modal',
  imports: [Btn, ModalShell],
  templateUrl: './sponsorship-picker-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SponsorshipPickerModal {
  readonly id = input.required<string>();
  readonly eventId = input.required<string>();
  /** La catégorie déjà posée sur le ticket, mise en évidence dans la liste. */
  readonly currentId = input<number | null>(null);
  /** `null` retire la prise en charge du ticket. */
  readonly picked = input<((category: SponsorshipCategory | null) => void) | null>(null);

  private readonly modalService = inject(ModalService);
  private readonly service = inject(SponsorshipsService);

  protected readonly icHand = LucideHandCoins;
  protected readonly modeLabels = SPONSORSHIP_MODE_LABELS;
  protected readonly formatCents = formatCents;

  protected readonly categories = signal<readonly SponsorshipCategory[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  /** L'effet, et non le constructeur : `eventId` est une entrée requise, la
   *  lire à la construction lèverait. */
  constructor() {
    effect(() => {
      const eventId = this.eventId();
      untracked(() => void this.load(eventId));
    });
  }

  private async load(eventId: string): Promise<void> {
    try {
      this.categories.set(await lastValueFrom(this.service.list(eventId)));
    } catch (error) {
      this.error.set(messageOf(error, 'Impossible de charger les prises en charge.'));
    } finally {
      this.loading.set(false);
    }
  }

  /** Le plus bas des prix consentis : ce que la tranche change, en un chiffre. */
  protected lowestPrice(category: SponsorshipCategory): number | null {
    if (category.prices.length === 0) return null;
    return Math.min(...category.prices.map((price) => price.priceCents));
  }

  /** Le QR a consommé son quota : la tranche n'est plus applicable. */
  protected exhausted(category: SponsorshipCategory): boolean {
    return category.maxOrders !== null && category.usedOrders >= category.maxOrders;
  }

  protected choose(category: SponsorshipCategory): void {
    if (this.exhausted(category)) return;

    this.picked()?.(category);
    this.modalService.close(this.id());
  }

  protected remove(): void {
    this.picked()?.(null);
    this.modalService.close(this.id());
  }

  protected cancel(): void {
    this.modalService.close(this.id());
  }
}

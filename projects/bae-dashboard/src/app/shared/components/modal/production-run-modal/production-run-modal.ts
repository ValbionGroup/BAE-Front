import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucideChefHat, LucideDownload } from '@lucide/angular';
import { lastValueFrom } from 'rxjs';
import { Btn, Field, Input, Badge, ToastService, messageOf } from '@bae/ui';
import {
  ProductionService,
  type ProductionNeed,
  type ProductionShortfall,
} from '#core/services/production/production-service';
import { PrintService } from '#core/services/print/print-service';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Lancer une production, en deux temps.
 *
 * **La simulation d'abord.** C'est elle qui répond littéralement à l'exigence du
 * cahier des charges — « le système indique de prendre le lot n°4, 5, 8 » — et
 * c'est ce que l'opérateur emmène aux étagères. Elle n'écrit rien.
 *
 * ⚠️ **Le plan affiché n'est pas rejoué à la confirmation.** Le back le
 * recalcule dans sa transaction : quelqu'un a pu prendre le même lot entre-temps.
 * Ce que la confirmation renvoie est ce qui a réellement été prélevé, et c'est
 * pourquoi l'écran le réaffiche au lieu de garder le plan simulé.
 */
@Component({
  selector: 'bfd-production-run-modal',
  imports: [Btn, Field, Input, Badge, ModalShell],
  templateUrl: './production-run-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionRunModal {
  readonly id = input.required<string>();
  readonly eventId = input.required<string>();
  readonly productId = input.required<number>();
  readonly productName = input.required<string>();
  readonly plannedQty = input<number>(0);
  readonly producedQty = input<number>(0);
  /** Appelé après un lancement abouti — la page recharge ses compteurs. */
  readonly onDone = input<() => void>(() => {});

  private readonly modalService = inject(ModalService);
  private readonly production = inject(ProductionService);
  private readonly toast = inject(ToastService);
  private readonly printService = inject(PrintService);

  protected readonly icChef = LucideChefHat;
  protected readonly icDownload = LucideDownload;

  protected readonly quantity = signal<string>('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Le plan simulé. `null` tant qu'on n'a pas demandé à voir. */
  protected readonly plan = signal<readonly ProductionNeed[] | null>(null);
  protected readonly shortfalls = signal<readonly ProductionShortfall[]>([]);

  /** Le reste à produire, proposé par défaut — jamais imposé. */
  protected readonly remaining = computed(() =>
    Math.max(0, this.plannedQty() - this.producedQty()),
  );

  protected readonly parsedQuantity = computed(() => {
    const raw = this.quantity().trim();
    if (raw === '') return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  });

  /** Un manque annoncé par la simulation rend la confirmation impossible : le
   *  back refuserait en bloc (409), autant le dire avant le clic. */
  protected readonly blocked = computed(() => this.shortfalls().length > 0);

  protected onQuantity(value: string): void {
    this.quantity.set(value);
    // Le plan cesse de valoir dès que la quantité change.
    this.plan.set(null);
    this.shortfalls.set([]);
  }

  protected useRemaining(): void {
    this.onQuantity(String(this.remaining()));
  }

  protected async simulate(): Promise<void> {
    const quantity = this.parsedQuantity();
    if (quantity === null || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await lastValueFrom(
        this.production.planRun(this.eventId(), this.productId(), quantity),
      );
      this.plan.set(result.lines);
      this.shortfalls.set(result.shortfalls);
    } catch (err: unknown) {
      this.error.set(messageOf(err, 'Le lancement a échoué.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async confirm(): Promise<void> {
    const quantity = this.parsedQuantity();
    if (quantity === null || this.busy() || this.blocked()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await lastValueFrom(
        this.production.commitRun(this.eventId(), this.productId(), quantity),
      );
      const lots = result.lines.reduce((sum, line) => sum + line.picks.length, 0);
      this.toast.show({
        type: 'success',
        title: 'Production lancée',
        message: `${quantity} × ${this.productName()} — ${lots} lot${lots > 1 ? 's' : ''} prélevé${lots > 1 ? 's' : ''}.`,
      });
      this.onDone()();
      this.modalService.close(this.id());
    } catch (err: unknown) {
      this.error.set(messageOf(err, 'Le lancement a échoué.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected cancel(): void {
    this.modalService.close(this.id());
  }

  protected printPlan(): void {
    this.printService.download(
      `/events/${this.eventId()}/production-plan/pdf`,
      `plan-fefo-${this.productName()}.pdf`,
    );
  }
}

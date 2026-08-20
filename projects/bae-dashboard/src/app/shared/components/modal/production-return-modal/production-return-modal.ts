import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { LucideDownload, LucidePackageOpen } from '@lucide/angular';
import { lastValueFrom } from 'rxjs';
import { Btn, Input, ToastService, messageOf } from '@bae/ui';
import {
  ProductionService,
  type ReturnableGood,
} from '#core/services/production/production-service';
import { PrintService } from '#core/services/print/print-service';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/** Ce qu'on fait d'une denrée qui n'a pas servi. */
type Destination = 'reserve' | 'discard';

interface ReturnLine {
  readonly good: ReturnableGood;
  readonly quantity: string;
  readonly destination: Destination;
}

/**
 * Fin de soirée : ce qui n'a pas servi repart en réserve, ou au rebut.
 *
 * ⚠️ **Le rebut n'écrit rien, et l'écran le dit.** La sortie de stock a eu lieu
 * au lancement de la production ; jeter, c'est simplement ne pas recréditer. Les
 * deux choix se distinguent donc par leur effet sur le stock, pas par une trace
 * — un compteur de gaspillage bâti là-dessus mentirait.
 *
 * Le retour porte sur la **soirée entière**, pas sur un lancement : l'opérateur
 * compte ce qui reste sur la paillasse, pas lancement par lancement. Et il
 * crédite les lots en ordre inverse du prélèvement — dernier pris, premier
 * remis — parce que les lots à DLC courte ont été ouverts en premier.
 */
@Component({
  selector: 'bfd-production-return-modal',
  imports: [Btn, Input, ModalShell],
  templateUrl: './production-return-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionReturnModal {
  readonly id = input.required<string>();
  readonly eventId = input.required<string>();
  readonly eventName = input<string>('');
  /** Appelé après une clôture aboutie. */
  readonly onDone = input<() => void>(() => {});

  private readonly modalService = inject(ModalService);
  private readonly production = inject(ProductionService);
  private readonly toast = inject(ToastService);
  private readonly printService = inject(PrintService);

  protected readonly icPackage = LucidePackageOpen;
  protected readonly icDownload = LucideDownload;

  protected readonly lines = signal<readonly ReturnLine[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  /**
   * Le chargement vit dans un `effect`, pas dans le constructeur : un
   * `input.required()` lu à l'instanciation lève toujours, les inputs n'étant
   * appliqués qu'après — et le `catch` transformerait cette erreur de cycle de
   * vie en « impossible de lire ce que la soirée a prélevé ».
   */
  constructor() {
    effect(() => {
      const eventId = this.eventId();
      untracked(() => void this.load(eventId));
    });
  }

  private async load(eventId: string): Promise<void> {
    try {
      const goods = await lastValueFrom(this.production.getReturnable(eventId));
      this.lines.set(
        goods.map((good) => ({ good, quantity: '', destination: 'reserve' as Destination })),
      );
    } catch (err: unknown) {
      this.error.set(messageOf(err, 'Impossible de lire ce que la soirée a prélevé.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected setQuantity(goodId: number, value: string): void {
    this.lines.update((lines) =>
      lines.map((line) => (line.good.goodId === goodId ? { ...line, quantity: value } : line)),
    );
  }

  protected setDestination(goodId: number, destination: Destination): void {
    this.lines.update((lines) =>
      lines.map((line) => (line.good.goodId === goodId ? { ...line, destination } : line)),
    );
  }

  protected parsed(line: ReturnLine): number | null {
    const raw = line.quantity.trim();
    if (raw === '') return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  /** Au-delà du retournable, le back refuse (400) — autant le dire avant. */
  protected tooMuch(line: ReturnLine): boolean {
    const value = this.parsed(line);
    return value !== null && value > line.good.returnableQty;
  }

  protected readonly anyInvalid = computed(() =>
    this.lines().some(
      (line) => this.tooMuch(line) || (line.quantity.trim() !== '' && this.parsed(line) === null),
    ),
  );

  /** Seules les lignes remises en réserve partent : le rebut n'écrit rien. */
  protected readonly toCredit = computed(() =>
    this.lines()
      .filter((line) => line.destination === 'reserve')
      .map((line) => ({ goodId: line.good.goodId, quantity: this.parsed(line) }))
      .filter((line): line is { goodId: number; quantity: number } => line.quantity !== null),
  );

  protected readonly discardedCount = computed(
    () =>
      this.lines().filter((line) => line.destination === 'discard' && this.parsed(line) !== null)
        .length,
  );

  protected async submit(): Promise<void> {
    if (this.busy() || this.anyInvalid()) return;
    const credits = this.toCredit();
    this.busy.set(true);
    this.error.set(null);
    try {
      if (credits.length > 0) {
        await lastValueFrom(this.production.commitReturns(this.eventId(), credits));
      }
      const discarded = this.discardedCount();
      this.toast.show({
        type: 'success',
        title: 'Soirée clôturée',
        message:
          credits.length === 0 && discarded === 0
            ? 'Aucun reste déclaré.'
            : `${credits.length} denrée${credits.length > 1 ? 's' : ''} remise${credits.length > 1 ? 's' : ''} en réserve` +
              (discarded > 0 ? `, ${discarded} au rebut.` : '.'),
      });
      this.onDone()();
      this.modalService.close(this.id());
    } catch (err: unknown) {
      this.error.set(messageOf(err, 'La clôture a échoué.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected cancel(): void {
    this.modalService.close(this.id());
  }

  protected printClosing(): void {
    this.printService.download(
      `/events/${this.eventId()}/production-returns/pdf`,
      `cloture-production-${this.eventId()}.pdf`,
    );
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { Order, OrderStatus, nextStatus } from '#core/models/order.model';
import { ModalService } from '#shared/components/modal/modal.service';
import { DeleteModalConfig } from '#shared/components/modal/modal.models';

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours >= 1) {
    const mm = String(minutes).padStart(2, '0');
    return `${hours}h ${mm}`;
  }
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
}

@Component({
  selector: 'bfd-order-card',
  templateUrl: './order-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderCard {
  private readonly modalService = inject(ModalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly order = input.required<Order>();
  readonly advance = output<Order>();
  readonly cancel = output<Order>();

  /** Ticks every second so elapsed time updates live. */
  private readonly tick = toSignal(
    interval(1000).pipe(takeUntilDestroyed(this.destroyRef)),
    { initialValue: 0 }
  );

  readonly elapsedLabel = computed(() => {
    void this.tick(); // reactive dependency
    return formatElapsed(Date.now() - this.order().createdAt);
  });

  readonly nextStatusValue = computed(() => nextStatus(this.order().status));

  readonly canAdvance = computed(() => this.nextStatusValue() !== null);

  readonly canCancel = computed(() => {
    const s = this.order().status;
    return s !== 'cancelled' && s !== 'completed';
  });

  readonly advanceLabel = computed(() => {
    switch (this.order().status) {
      case 'pending': return 'Commencer';
      case 'in_progress': return 'Marquer prêt';
      case 'ready': return 'Terminer';
      default: return 'Avancer';
    }
  });

  readonly statusLabel = computed(() => {
    const labels: Record<OrderStatus, string> = {
      pending: 'En attente',
      in_progress: 'En préparation',
      ready: 'Prêt',
      completed: 'Terminé',
      cancelled: 'Annulé',
    };
    return labels[this.order().status];
  });

  readonly statusClasses = computed(() => {
    const map: Record<OrderStatus, string> = {
      pending:
        'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
      in_progress:
        'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
      ready:
        'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
      completed:
        'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400',
      cancelled:
        'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
    };
    return map[this.order().status];
  });

  readonly cardClasses = computed(() => {
    const base =
      'rounded-2xl border overflow-hidden flex flex-col transition-colors duration-150 ';
    const map: Record<OrderStatus, string> = {
      pending:
        'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
      in_progress:
        'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
      ready:
        'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
      completed:
        'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
      cancelled:
        'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800',
    };
    return base + map[this.order().status];
  });

  onCardClick(): void {
    if (this.canAdvance()) {
      this.advance.emit(this.order());
    }
  }

  onAdvanceClick(event: MouseEvent): void {
    event.stopPropagation();
    if (this.canAdvance()) {
      this.advance.emit(this.order());
    }
  }

  onCancelClick(event: MouseEvent): void {
    event.stopPropagation();
    const order = this.order();
    const config: Omit<DeleteModalConfig, 'id'> = {
      type: 'delete',
      title: 'Annuler la commande',
      message: `Annuler la commande #${order.number} ?`,
      details: 'Cette action est irréversible.',
      onConfirm: () => this.cancel.emit(order),
    };
    this.modalService.open(config);
  }
}

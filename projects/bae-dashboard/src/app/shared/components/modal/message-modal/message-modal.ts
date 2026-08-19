import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  LucideAlertTriangle,
  LucideCheckCircle,
  LucideIconInput,
  LucideInfo,
  LucideXCircle,
} from '@lucide/angular';
import { Btn } from '@bae/ui';
import { MessageModalConfig, ModalAction } from '../modal.models';
import { ModalShell, ModalTone } from '../modal-shell/modal-shell';

const NOOP = () => {};

const TYPE_META: Record<
  MessageModalConfig['type'],
  { icon: LucideIconInput; tone: ModalTone; defaultActions: ModalAction[] }
> = {
  error: {
    icon: LucideXCircle,
    tone: 'danger',
    defaultActions: [{ label: 'Dismiss', action: NOOP, variant: 'secondary' }],
  },
  success: {
    icon: LucideCheckCircle,
    tone: 'ok',
    defaultActions: [{ label: 'OK', action: NOOP, variant: 'primary' }],
  },
  warning: {
    icon: LucideAlertTriangle,
    tone: 'warn',
    defaultActions: [
      { label: 'Cancel', action: NOOP, variant: 'secondary' },
      { label: 'Confirm', action: NOOP, variant: 'primary' },
    ],
  },
  info: {
    icon: LucideInfo,
    tone: 'blue',
    defaultActions: [{ label: 'Close', action: NOOP, variant: 'secondary' }],
  },
};

@Component({
  selector: 'bfd-message-modal',
  imports: [Btn, ModalShell],
  templateUrl: './message-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageModal {
  config = input.required<MessageModalConfig>();
  close = output<void>();

  protected readonly showDetails = signal(false);
  protected readonly meta = computed(() => TYPE_META[this.config().type]);
  protected readonly actions = computed(() => this.config().actions ?? this.meta().defaultActions);

  protected onClose(): void {
    this.close.emit();
  }

  protected onAction(action: () => void): void {
    action();
    this.close.emit();
  }

  protected toggleDetails(): void {
    this.showDetails.update((v) => !v);
  }
}

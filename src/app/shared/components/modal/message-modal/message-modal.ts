import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  LucideAlertTriangle,
  LucideCheckCircle,
  LucideDynamicIcon,
  LucideIconInput,
  LucideInfo,
  LucideX,
  LucideXCircle,
} from '@lucide/angular';
import { Btn } from '#shared/components/ui/btn/btn';
import { MessageModalConfig, ModalAction } from '../modal.models';

const NOOP = () => {};

const TYPE_META: Record<
  MessageModalConfig['type'],
  { icon: LucideIconInput; iconClass: string; iconBg: string; defaultActions: ModalAction[] }
> = {
  error: {
    icon: LucideXCircle,
    iconClass: 'text-danger',
    iconBg: 'bg-danger-soft',
    defaultActions: [{ label: 'Dismiss', action: NOOP, variant: 'secondary' }],
  },
  success: {
    icon: LucideCheckCircle,
    iconClass: 'text-ok',
    iconBg: 'bg-ok-soft',
    defaultActions: [{ label: 'OK', action: NOOP, variant: 'primary' }],
  },
  warning: {
    icon: LucideAlertTriangle,
    iconClass: 'text-warn',
    iconBg: 'bg-warn-soft',
    defaultActions: [
      { label: 'Cancel', action: NOOP, variant: 'secondary' },
      { label: 'Confirm', action: NOOP, variant: 'primary' },
    ],
  },
  info: {
    icon: LucideInfo,
    iconClass: 'text-blue',
    iconBg: 'bg-blue-soft',
    defaultActions: [{ label: 'Close', action: NOOP, variant: 'secondary' }],
  },
};

@Component({
  selector: 'bfd-message-modal',
  imports: [LucideDynamicIcon, LucideX, Btn],
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

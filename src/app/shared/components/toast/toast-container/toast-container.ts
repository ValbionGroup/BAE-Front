import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  LucideCheck,
  LucideClock,
  LucideDynamicIcon,
  LucideIconInput,
  LucideTriangleAlert,
  LucideX,
  LucideZap,
} from '@lucide/angular';
import { ToastConfig, ToastType } from '../toast.models';
import { ToastService } from '../toast.service';

interface ToastMeta {
  borderColor: string;
  iconBg: string;
  iconColor: string;
  icon: LucideIconInput;
  bar: string;
}

const TYPE_META: Record<ToastType, ToastMeta> = {
  error: {
    borderColor: 'border-l-danger',
    iconBg: 'bg-danger-soft',
    iconColor: 'text-danger',
    icon: LucideTriangleAlert,
    bar: 'bg-danger',
  },
  success: {
    borderColor: 'border-l-ok',
    iconBg: 'bg-ok-soft',
    iconColor: 'text-ok',
    icon: LucideCheck,
    bar: 'bg-ok',
  },
  warning: {
    borderColor: 'border-l-warn',
    iconBg: 'bg-warn-soft',
    iconColor: 'text-warn',
    icon: LucideClock,
    bar: 'bg-warn',
  },
  info: {
    borderColor: 'border-l-blue',
    iconBg: 'bg-blue-soft',
    iconColor: 'text-blue',
    icon: LucideZap,
    bar: 'bg-blue',
  },
};

@Component({
  selector: 'bfd-toast-container',
  imports: [LucideX, LucideDynamicIcon],
  templateUrl: './toast-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainer {
  private readonly toastService = inject(ToastService);

  protected readonly toasts = this.toastService.toasts;
  protected readonly typeMeta = TYPE_META;

  protected dismiss(id: string): void {
    this.toastService.dismiss(id);
  }

  protected animationStyle(toast: ToastConfig): string {
    return `toast-shrink ${toast.duration ?? 4000}ms linear forwards`;
  }

  protected hasDuration(toast: ToastConfig): boolean {
    return (toast.duration ?? 4000) > 0;
  }
}

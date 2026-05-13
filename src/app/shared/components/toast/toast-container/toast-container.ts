import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideX } from '@lucide/angular';
import { ToastConfig, ToastType } from '../toast.models';
import { ToastService } from '../toast.service';

const TYPE_CLASSES: Record<ToastType, { card: string; dot: string; bar: string }> = {
  error: {
    card: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
    bar: 'bg-red-400',
  },
  success: {
    card: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
    dot: 'bg-green-500',
    bar: 'bg-green-400',
  },
  warning: {
    card: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
    bar: 'bg-amber-400',
  },
  info: {
    card: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
    bar: 'bg-blue-400',
  },
};

@Component({
  selector: 'bfd-toast-container',
  imports: [LucideX],
  templateUrl: './toast-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainer {
  private readonly toastService = inject(ToastService);

  protected readonly toasts = this.toastService.toasts;
  protected readonly typeClasses = TYPE_CLASSES;

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

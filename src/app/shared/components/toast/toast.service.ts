import { Injectable, signal } from '@angular/core';
import { ToastConfig } from './toast.models';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly stack = signal<ToastConfig[]>([]);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly toasts = this.stack.asReadonly();

  show(config: Omit<ToastConfig, 'id'>): string {
    const id = crypto.randomUUID();
    const toast: ToastConfig = { ...config, id };

    this.stack.update((toasts) => {
      const updated = [...toasts, toast];
      if (updated.length > 5) {
        updated.shift();
      }
      return updated;
    });

    const duration = config.duration ?? 4000;
    if (duration > 0) {
      const timer = setTimeout(() => {
        this.dismiss(id);
      }, duration);
      this.timers.set(id, timer);
    }

    return id;
  }

  dismiss(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.stack.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }
}

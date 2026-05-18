import { Injectable, signal } from '@angular/core';
import { ModalConfig } from './modal.models';

// Distributes Omit across the union so each variant keeps its discriminant
// fields (a plain `Omit<ModalConfig, 'id'>` collapses to the shared keys
// only, which strips `component`, `actions`, etc.).
type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

export type ModalOpenConfig = DistributiveOmit<ModalConfig, 'id'>;

@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly stack = signal<ModalConfig[]>([]);
  readonly modals = this.stack.asReadonly();

  open(config: ModalOpenConfig): string {
    const id = crypto.randomUUID();
    this.stack.update((s) => [...s, { ...config, id } as ModalConfig]);
    return id;
  }

  close(id: string): void {
    this.stack.update((s) => s.filter((m) => m.id !== id));
  }
}

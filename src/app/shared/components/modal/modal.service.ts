import { Injectable, signal } from '@angular/core';
import { ModalConfig } from './modal.models';

@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly stack = signal<ModalConfig[]>([]);
  readonly modals = this.stack.asReadonly();

  open(config: Omit<ModalConfig, 'id'>): string {
    const id = crypto.randomUUID();
    this.stack.update((s) => [...s, { ...config, id } as ModalConfig]);
    return id;
  }

  close(id: string): void {
    this.stack.update((s) => s.filter((m) => m.id !== id));
  }
}

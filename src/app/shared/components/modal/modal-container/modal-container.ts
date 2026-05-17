import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { DOCUMENT, NgComponentOutlet } from '@angular/common';
import { ModalService } from '../modal.service';
import {
  ComponentModalConfig,
  DeleteModalConfig,
  ModalConfig,
  MessageModalConfig,
} from '../modal.models';
import { MessageModal } from '../message-modal/message-modal';
import { DeleteModal } from '../delete-modal/delete-modal';

@Component({
  selector: 'bfd-modal-container',
  imports: [MessageModal, DeleteModal, NgComponentOutlet],
  templateUrl: './modal-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeTop()',
    '(document:keydown.tab)': 'trapFocus($event)',
  },
})
export class ModalContainer {
  private readonly modalService = inject(ModalService);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  private readonly previousFocus = signal<Element | null>(null);

  protected readonly modals = this.modalService.modals;
  protected readonly visibleModals = computed(() => this.modals().slice(-3));

  constructor() {
    effect(() => {
      const count = this.modals().length;

      if (count === 1) {
        this.previousFocus.set(this.document.activeElement);
      }

      if (count > 0) {
        const topModal = this.modals()[count - 1];
        afterNextRender(
          () => {
            const panel = this.document.querySelector(`[data-modal-id="${topModal.id}"]`);
            if (panel) {
              const focusable = panel.querySelector<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
              );
              focusable?.focus();
            }
          },
          { injector: this.injector },
        );
      } else {
        const prev = this.previousFocus();
        if (prev instanceof HTMLElement) {
          prev.focus();
        }
        this.previousFocus.set(null);
      }
    });
  }

  protected trapFocus(event: Event): void {
    if (!this.modals().length) return;
    const ke = event as KeyboardEvent;
    const topId = this.modals()[this.modals().length - 1].id;
    const panel = this.document.querySelector<HTMLElement>(`[data-modal-id="${topId}"]`);
    if (!panel) return;
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (
      ke.shiftKey ? this.document.activeElement === first : this.document.activeElement === last
    ) {
      event.preventDefault();
      (ke.shiftKey ? last : first).focus();
    }
  }

  protected closeTop(): void {
    const stack = this.modals();
    if (stack.length > 0) {
      this.modalService.close(stack[stack.length - 1].id);
    }
  }

  protected close(id: string): void {
    this.modalService.close(id);
  }

  protected stackTransform(index: number, total: number): string {
    const depth = total - 1 - index;
    return `translateY(${depth * 8}px) scale(${1 - depth * 0.03})`;
  }

  protected asMessage(config: ModalConfig): MessageModalConfig {
    return config as MessageModalConfig;
  }

  protected asDelete(config: ModalConfig): DeleteModalConfig {
    return config as DeleteModalConfig;
  }

  protected asComponent(config: ModalConfig): ComponentModalConfig {
    return config as ComponentModalConfig;
  }

  /** Build NgComponentOutlet inputs by merging the caller's payload with the
   *  modal id, which the component uses to call `modalService.close(id)`. */
  protected componentInputs(config: ComponentModalConfig): Record<string, unknown> {
    return { ...(config.inputs ?? {}), id: config.id };
  }
}

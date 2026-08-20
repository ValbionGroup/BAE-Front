import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { LucideTrash2 } from '@lucide/angular';
import { Btn } from '@bae/ui';
import { DeleteModalConfig } from '../modal.models';
import { ModalShell } from '../modal-shell/modal-shell';

@Component({
  selector: 'bfd-delete-modal',
  imports: [Btn, ModalShell],
  templateUrl: './delete-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteModal {
  config = input.required<DeleteModalConfig>();
  close = output<void>();

  protected readonly icTrash = LucideTrash2;

  protected readonly typedText = signal('');

  protected readonly canConfirm = computed(
    () => !this.config().confirmationText || this.typedText() === this.config().confirmationText,
  );

  protected onClose(): void {
    this.close.emit();
  }

  protected onConfirm(): void {
    this.config().onConfirm();
    this.close.emit();
  }

  protected onTyped(event: Event): void {
    this.typedText.set((event.target as HTMLInputElement).value);
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  LucideBox,
  LucideCheck,
  LucideDynamicIcon,
  LucideIconInput,
  LucideQrCode,
  LucideTicket,
  LucideTrash2,
  LucideUsers,
} from '@lucide/angular';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Field } from '#shared/components/ui/field/field';
import { Input } from '#shared/components/ui/input/input';
import { CoordinationStore } from '#core/store/coordination.store';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

interface Impact {
  readonly a: string;
  readonly b: string;
  readonly icon: LucideIconInput;
}

@Component({
  selector: 'bfd-coordination-delete-modal',
  imports: [Btn, Badge, Field, Input, ModalShell, LucideDynamicIcon],
  templateUrl: './coordination-delete-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoordinationDeleteModal {
  readonly id = input.required<string>();
  readonly eventId = input.required<number>();
  /** Display name of the event being deleted. */
  readonly eventName = input<string>('Soirée Hivernale');
  readonly onDeleted = input<(() => void) | null>(null);

  private readonly modalService = inject(ModalService);
  private readonly store = inject(CoordinationStore);

  protected readonly icTrash = LucideTrash2;
  protected readonly icCheck = LucideCheck;

  protected readonly confirmText = signal('');
  protected readonly deleting = signal(false);

  protected readonly canDelete = computed(
    () => this.confirmText().trim() === 'SUPPRIMER' && !this.deleting(),
  );

  protected readonly impacts: readonly Impact[] = [
    { a: '5 recettes assignées', b: 'seront retirées', icon: LucideBox },
    { a: '18 affectations de postes', b: 'seront annulées', icon: LucideUsers },
    { a: '47 précommandes', b: 'seront remboursées (Lydia)', icon: LucideQrCode },
    { a: "218 € de bons d'achat", b: 'redeviendront disponibles', icon: LucideTicket },
  ];

  protected confirmDelete(): void {
    if (!this.canDelete()) return;

    this.deleting.set(true);
    this.store
      .deleteEvent(this.eventId())
      .then(() => {
        this.onDeleted()?.();
        this.close();
      })
      .catch(() => {
        this.deleting.set(false);
      });
  }

  protected close(): void {
    this.modalService.close(this.id());
  }
}

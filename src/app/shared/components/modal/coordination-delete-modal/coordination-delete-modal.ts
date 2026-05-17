import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
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
  /** Display name of the event being deleted. */
  readonly eventName = input<string>('Soirée Hivernale');

  private readonly modalService = inject(ModalService);

  protected readonly icTrash = LucideTrash2;
  protected readonly icCheck = LucideCheck;

  protected readonly impacts: readonly Impact[] = [
    { a: '5 recettes assignées', b: 'seront retirées', icon: LucideBox },
    { a: '18 affectations de postes', b: 'seront annulées', icon: LucideUsers },
    { a: '47 précommandes', b: 'seront remboursées (Lydia)', icon: LucideQrCode },
    { a: "218 € de bons d'achat", b: 'redeviendront disponibles', icon: LucideTicket },
  ];

  protected close(): void {
    this.modalService.close(this.id());
  }
}

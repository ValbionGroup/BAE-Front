import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import {
  LucideCalendar,
  LucideChevronDown,
  LucideDynamicIcon,
  LucidePlus,
  LucideTriangleAlert,
  LucideZap,
} from '@lucide/angular';
import { Btn, Field, Input } from '@bae/ui';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

@Component({
  selector: 'bfd-scanner-unknown-modal',
  imports: [Btn, Field, Input, ModalShell, LucideDynamicIcon],
  templateUrl: './scanner-unknown-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScannerUnknownModal {
  readonly id = input.required<string>();
  /** Barcode that was scanned but unknown. */
  readonly barcode = input<string>('4 102 884 002 110');

  private readonly modalService = inject(ModalService);

  protected readonly icAlert = LucideTriangleAlert;
  protected readonly icPlus = LucidePlus;
  protected readonly icZap = LucideZap;
  protected readonly icCalendar = LucideCalendar;
  protected readonly icChevDown = LucideChevronDown;

  protected readonly emplacements = ['Frigo A', 'Frigo B', 'Congélateur', 'Réserve', 'Bar'];
  protected readonly selectedEmpl = signal<number>(3);

  protected close(): void {
    this.modalService.close(this.id());
  }

  protected setEmpl(i: number): void {
    this.selectedEmpl.set(i);
  }
}

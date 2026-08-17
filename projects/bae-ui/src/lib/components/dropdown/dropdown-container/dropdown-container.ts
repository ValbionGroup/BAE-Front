import { ChangeDetectionStrategy, Component, ElementRef, inject } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { FloatingDirective } from '../../../directives/floating/floating.directive';
import { Kbd } from '../../ui/kbd/kbd';
import { DropdownService } from '../dropdown.service';
import { DropdownItemAction } from '../dropdown.models';

@Component({
  selector: 'bae-dropdown-container',
  imports: [FloatingDirective, LucideDynamicIcon, Kbd],
  templateUrl: './dropdown-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'service.close()',
  },
})
export class DropdownContainer {
  protected readonly service = inject(DropdownService);
  protected readonly current = this.service.current;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected onItemClick(item: DropdownItemAction): void {
    if (item.disabled) return;
    item.onClick();
    this.service.close();
  }

  protected onDocumentClick(event: Event): void {
    const cur = this.current();
    if (!cur) return;
    const target = event.target as Node;
    // Clicks on the anchor are handled by the anchor's own toggle handler.
    if (cur.anchor.contains(target)) return;
    // Clicks inside the rendered dropdown should not close it.
    if (this.host.nativeElement.contains(target)) return;
    this.service.close();
  }
}

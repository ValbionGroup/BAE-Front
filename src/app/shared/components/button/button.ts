import { Component, input } from '@angular/core';
import { LucideDynamicIcon, LucideIconInput, LucidePlus } from '@lucide/angular';

@Component({
  selector: 'bfd-button',
  imports: [LucideDynamicIcon],
  templateUrl: './button.html',
})
export class Button {
  label = input.required<string>();
  icon = input<LucideIconInput | null>(null);
  action = input.required<() => void>();
}

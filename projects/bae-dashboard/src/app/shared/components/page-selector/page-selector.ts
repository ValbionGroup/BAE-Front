import { Component, input } from '@angular/core';
import { LucideDynamicIcon, LucideIconInput } from '@lucide/angular';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface PageSelectorComponent {
  label: string;
  icon: LucideIconInput;
  route: string;
}

@Component({
  selector: 'bfd-page-selector',
  imports: [LucideDynamicIcon, RouterLink, RouterLinkActive],
  templateUrl: './page-selector.html',
})
export class PageSelector {
  pages = input<PageSelectorComponent[]>();
}

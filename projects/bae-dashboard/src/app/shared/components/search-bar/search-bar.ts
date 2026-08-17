import { Component, input, output } from '@angular/core';
import { LucideSearch } from '@lucide/angular';

@Component({
  selector: 'bfd-search-bar',
  imports: [LucideSearch],
  templateUrl: './search-bar.html',
})
export class SearchBar {
  hint = input<string>();
  search = output<Event>();
}

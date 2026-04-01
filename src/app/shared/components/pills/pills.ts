import {Component, input, output} from '@angular/core';
import {Pill} from '#shared/components/pills/pill/pill';

export interface PillElement {
  label: string;
  key: string;
}

@Component({
  selector: 'bfd-pills',
  imports: [
    Pill
  ],
  templateUrl: './pills.html'
})
export class Pills {
  pillListLabel = input.required<string>();
  isAllAvailable = input<boolean>(true);
  currentActive = input<string>('all');
  pills = input<PillElement[]>([]);

  clickedOnPill = output<string>();

  protected setActive(key: string) {
    this.clickedOnPill.emit(key);
  }
}

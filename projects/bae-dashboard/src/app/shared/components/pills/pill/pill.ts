import { Component, input } from '@angular/core';

@Component({
  selector: 'bfd-pill',
  imports: [],
  templateUrl: './pill.html',
})
export class Pill {
  action = input<() => void>();
  active = input<boolean>(false);
  label = input<string>();

  protected onClick() {
    if (this.action()) {
      this.action()!();
    }
  }
}

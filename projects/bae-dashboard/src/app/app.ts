import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModalContainer } from '#shared/components/modal/modal-container/modal-container';
import { ToastContainer, DropdownContainer, TooltipContainer } from '@bae/ui';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ModalContainer, ToastContainer, DropdownContainer, TooltipContainer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('BAE-Front');
}

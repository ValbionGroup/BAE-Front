import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModalContainer } from '#shared/components/modal/modal-container/modal-container';
import { ToastContainer } from '#shared/components/toast/toast-container/toast-container';
import { DropdownContainer } from '#shared/components/dropdown/dropdown-container/dropdown-container';
import { TooltipContainer } from '#shared/components/tooltip/tooltip-container/tooltip-container';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ModalContainer, ToastContainer, DropdownContainer, TooltipContainer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('BAE-Front');
}

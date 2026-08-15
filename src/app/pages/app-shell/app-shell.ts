import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModalContainer } from '#shared/components/modal/modal-container/modal-container';
import { ToastContainer } from '#shared/components/toast/toast-container/toast-container';
import { DropdownContainer } from '#shared/components/dropdown/dropdown-container/dropdown-container';
import { TooltipContainer } from '#shared/components/tooltip/tooltip-container/tooltip-container';
import { Sidebar } from './components/sidebar/sidebar';
import { Topbar } from './components/topbar/topbar';

@Component({
  selector: 'bfd-app-shell',
  imports: [
    RouterOutlet,
    ModalContainer,
    ToastContainer,
    DropdownContainer,
    TooltipContainer,
    Sidebar,
    Topbar,
  ],
  templateUrl: './app-shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {
  /**
   * La sidebar est un tiroir sous `md` : à 402 px de large elle mangeait plus de
   * la moitié de l'écran. Au-delà, elle reste en colonne fixe et cet état est
   * sans effet.
   */
  protected readonly navOpen = signal(false);
}

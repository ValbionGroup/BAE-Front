import { ChangeDetectionStrategy, Component } from '@angular/core';
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
export class AppShell {}

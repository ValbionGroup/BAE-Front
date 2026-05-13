import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModalContainer } from '#shared/components/modal/modal-container/modal-container';
import { ToastContainer } from '#shared/components/toast/toast-container/toast-container';
import { Sidebar } from './components/sidebar/sidebar';
import { Topbar } from './components/topbar/topbar';

@Component({
  selector: 'bfd-app-shell',
  imports: [RouterOutlet, ModalContainer, ToastContainer, Sidebar, Topbar],
  templateUrl: './app-shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {}

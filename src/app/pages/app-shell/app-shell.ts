import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '#shared/components/header/header';
import { ModalContainer } from '#shared/components/modal/modal-container/modal-container';
import { ToastContainer } from '#shared/components/toast/toast-container/toast-container';

@Component({
  selector: 'bfd-app-shell',
  imports: [RouterOutlet, Header, ModalContainer, ToastContainer],
  templateUrl: './app-shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {}

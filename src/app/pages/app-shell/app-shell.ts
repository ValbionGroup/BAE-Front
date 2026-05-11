import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '#shared/components/header/header';

@Component({
  selector: 'bfd-app-shell',
  imports: [RouterOutlet, Header],
  templateUrl: './app-shell.html',
})
export class AppShell {}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  LucideArrowRight,
  LucideDynamicIcon,
  LucideShield,
  LucideTriangleAlert,
} from '@lucide/angular';
import * as AuthActions from '#core/store/auth/auth.actions';
import { selectLoginError } from '#core/store/auth/auth.selector';
import { TextInput } from '#shared/components/text-input/text-input';
import { Logo } from '#shared/components/ui/logo/logo';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Field } from '#shared/components/ui/field/field';
import { Toggle } from '#shared/components/ui/toggle/toggle';

@Component({
  selector: 'bfd-login',
  imports: [ReactiveFormsModule, TextInput, Logo, Btn, Badge, Field, Toggle, LucideDynamicIcon],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  protected readonly loginError = toSignal(this.store.select(selectLoginError));
  protected readonly year = computed(() => new Date().getFullYear());
  protected readonly rememberMe = signal<boolean>(false);

  protected form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly icShield = LucideShield;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icAlert = LucideTriangleAlert;

  protected readonly brandTags = [
    'Gestion des présence',
    'Commandes',
    'Caisse en temps réel',
    'Scan de QR',
    'Statistiques',
  ];

  protected onSubmit(): void {
    if (this.form.invalid) return;
    const { email, password } = this.form.value;
    this.store.dispatch(AuthActions.loginStart({ email: email!, password: password! }));
  }

  protected loginWithEirbConnect(): void {
    // TODO: redirect to EirbConnect / ENT Bordeaux INP OAuth endpoint
  }

  protected switchRemember() {
    this.rememberMe.set(!this.rememberMe());
  }
}

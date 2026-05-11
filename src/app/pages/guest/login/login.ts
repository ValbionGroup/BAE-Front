import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import * as AuthActions from '#core/store/auth/auth.actions';
import { selectLoginError } from '#core/store/auth/auth.selector';
import { TextInput } from '#shared/components/text-input/text-input';

@Component({
  selector: 'bfd-login',
  imports: [ReactiveFormsModule, TextInput],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  protected readonly loginError = toSignal(this.store.select(selectLoginError));

  protected form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected onSubmit(): void {
    if (this.form.invalid) return;
    const { email, password } = this.form.value;
    this.store.dispatch(AuthActions.loginStart({ email: email!, password: password! }));
  }

  protected loginWithEirbConnect(): void {
    // TODO: redirect to EirbConnect OAuth endpoint
  }
}

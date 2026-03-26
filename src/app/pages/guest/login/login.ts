import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonDirective, ButtonIcon, ButtonLabel } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';
import { inject } from '@angular/core';

@Component({
  selector: 'bfd-login',
  imports: [ReactiveFormsModule, ButtonDirective, ButtonIcon, ButtonLabel, Checkbox, InputText],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private fb = inject(FormBuilder);

  protected form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: [false],
  });

  protected onSubmit(): void {
    if (this.form.invalid) return;
    // TODO: dispatch login action
  }
}

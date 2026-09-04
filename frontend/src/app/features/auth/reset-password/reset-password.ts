import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

function matchPassword(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return pw && confirm && pw !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reset-password.html',
  styleUrl: '../auth-form.scss',
})
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly submitting = signal(false);
  protected readonly token = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('token') ?? '')),
    { initialValue: '' },
  );

  protected readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', [Validators.required]],
    },
    { validators: matchPassword },
  );

  submit(): void {
    if (this.form.invalid || !this.token()) {
      this.form.markAllAsTouched();
      if (!this.token()) this.toast.error('This reset link is missing its token.');
      return;
    }
    this.submitting.set(true);
    this.auth
      .resetPassword({ token: this.token(), password: this.form.getRawValue().password })
      .subscribe({
        next: () => {
          this.toast.success('Password updated — please sign in.');
          this.router.navigate(['/auth/login']);
        },
        error: () => this.submitting.set(false),
        complete: () => this.submitting.set(false),
      });
  }
}

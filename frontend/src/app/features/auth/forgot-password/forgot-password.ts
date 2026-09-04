import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forgot-password.html',
  styleUrl: '../auth-form.scss',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  /** Dev only: the API returns the raw token outside production so we can test the flow. */
  protected readonly devToken = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    identifier: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.auth.forgotPassword(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.sent.set(true);
        this.devToken.set(res.resetToken ?? null);
      },
      error: () => this.submitting.set(false),
      complete: () => this.submitting.set(false),
    });
  }
}

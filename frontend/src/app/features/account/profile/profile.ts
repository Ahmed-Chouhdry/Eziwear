import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

function match(group: AbstractControl): ValidationErrors | null {
  return group.get('newPassword')?.value &&
    group.get('confirm')?.value &&
    group.get('newPassword')?.value !== group.get('confirm')?.value
    ? { mismatch: true }
    : null;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);

  protected readonly profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
  });

  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', [Validators.required]],
    },
    { validators: match },
  );

  constructor() {
    effect(() => {
      const u = this.auth.user();
      if (u) {
        this.profileForm.patchValue({ name: u.name, phone: u.phone ?? '' }, { emitEvent: false });
      }
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile.set(true);
    const v = this.profileForm.getRawValue();
    this.auth.updateProfile({ name: v.name, phone: v.phone || undefined }).subscribe({
      next: () => this.toast.success('Profile updated.'),
      error: () => this.savingProfile.set(false),
      complete: () => this.savingProfile.set(false),
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.savingPassword.set(true);
    const v = this.passwordForm.getRawValue();
    this.auth
      .changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword })
      .subscribe({
        next: () => {
          this.toast.success('Password changed.');
          this.passwordForm.reset();
        },
        error: () => this.savingPassword.set(false),
        complete: () => this.savingPassword.set(false),
      });
  }
}

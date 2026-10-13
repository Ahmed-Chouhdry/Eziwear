import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminOfferService, OfferPayload } from '../../../core/services/admin-offer.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './offers.html',
  styleUrl: './offers.scss',
})
export class Offers {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminOfferService);
  private readonly toast = inject(ToastService);
  private readonly confirmSvc = inject(ConfirmService);

  private readonly audienceRes = rxResource({ stream: () => this.api.audience() });
  protected readonly audience = computed(() => this.audienceRes.value());
  protected readonly sending = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    subject: ['', [Validators.required, Validators.minLength(3)]],
    headline: ['', [Validators.required, Validators.minLength(3)]],
    message: ['', [Validators.required, Validators.minLength(5)]],
    couponCode: [''],
    ctaLabel: ['Shop now'],
    ctaUrl: [''],
  });

  private payload(testOnly: boolean): OfferPayload {
    const v = this.form.getRawValue();
    return {
      subject: v.subject,
      headline: v.headline,
      message: v.message,
      couponCode: v.couponCode.trim() || undefined,
      ctaLabel: v.ctaLabel.trim() || undefined,
      ctaUrl: v.ctaUrl.trim() || undefined,
      testOnly,
    };
  }

  sendTest(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.run(true);
  }

  async sendAll(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const n = this.audience()?.recipients ?? 0;
    const ok = await this.confirmSvc.confirm({
      title: 'Send to all customers?',
      message: `This will email ${n} customer${n === 1 ? '' : 's'}. It cannot be undone.`,
      confirmText: `Send to ${n}`,
    });
    if (ok) this.run(false);
  }

  private run(testOnly: boolean): void {
    this.sending.set(true);
    this.api.send(this.payload(testOnly)).subscribe({
      next: (r) => {
        this.toast.success(
          r.test ? 'Test email sent to your own address.' : `Sending to ${r.queued} customers…`,
        );
        this.sending.set(false);
      },
      error: () => this.sending.set(false),
    });
  }
}

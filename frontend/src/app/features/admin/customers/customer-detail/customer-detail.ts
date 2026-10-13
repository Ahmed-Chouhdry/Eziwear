import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AdminCustomerService } from '../../../../core/services/admin-customer.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UiSpinner } from '../../../../shared/components/ui-spinner/ui-spinner';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, PricePipe, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-detail.html',
  styleUrl: './customer-detail.scss',
})
export class CustomerDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AdminCustomerService);
  private readonly toast = inject(ToastService);
  private readonly confirmSvc = inject(ConfirmService);

  protected readonly updating = signal(false);
  protected readonly savingDiscount = signal(false);
  protected readonly discountInput = signal<string | null>(null);

  /** Quick-pick presets shown as chips. */
  protected readonly presets = [0, 5, 10, 15, 20];

  protected readonly id = toSignal(
    this.route.paramMap.pipe(map((p) => Number(p.get('id')))),
    { initialValue: 0 },
  );

  private readonly res = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.api.get(params),
  });

  protected readonly loading = computed(() => this.res.isLoading());
  protected readonly customer = computed(() => this.res.value());

  protected discountValue(): string {
    return this.discountInput() ?? String(this.customer()?.discountPercent ?? 0);
  }

  protected onDiscountInput(event: Event): void {
    this.discountInput.set((event.target as HTMLInputElement).value);
  }

  saveDiscount(raw?: string): void {
    const c = this.customer();
    if (!c) return;
    const value = Number(raw ?? this.discountValue());
    if (!Number.isFinite(value) || value < 0 || value > 90) {
      this.toast.error('Enter a discount between 0 and 90%.');
      return;
    }
    this.savingDiscount.set(true);
    this.api.updateDiscount(c.id, value).subscribe({
      next: () => {
        this.toast.success(value > 0 ? `${value}% discount set for ${c.name}.` : 'Discount removed.');
        this.discountInput.set(null);
        this.res.reload();
      },
      error: () => this.savingDiscount.set(false),
      complete: () => this.savingDiscount.set(false),
    });
  }

  async toggleStatus(): Promise<void> {
    const c = this.customer();
    if (!c) return;
    const next = c.status === 'active' ? 'suspended' : 'active';
    if (next === 'suspended') {
      const ok = await this.confirmSvc.confirm({
        message: `Suspend ${c.name}? They won't be able to sign in.`,
        danger: true,
        confirmText: 'Suspend',
      });
      if (!ok) return;
    }
    this.updating.set(true);
    this.api.updateStatus(c.id, next).subscribe({
      next: () => {
        this.toast.success(next === 'suspended' ? 'Customer suspended.' : 'Customer reactivated.');
        this.res.reload();
      },
      error: () => this.updating.set(false),
      complete: () => this.updating.set(false),
    });
  }
}

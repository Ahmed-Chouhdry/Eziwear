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
  /** null = follow what's saved on the customer (Rs if an amount is set, else %). */
  private readonly modeOverride = signal<'percent' | 'amount' | null>(null);

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

  protected readonly mode = computed<'percent' | 'amount'>(
    () => this.modeOverride() ?? ((this.customer()?.discountAmount ?? 0) > 0 ? 'amount' : 'percent'),
  );

  protected setMode(m: 'percent' | 'amount'): void {
    this.modeOverride.set(m);
    this.discountInput.set(null);
  }

  protected discountValue(): string {
    const c = this.customer();
    const saved = this.mode() === 'amount' ? c?.discountAmount : c?.discountPercent;
    return this.discountInput() ?? String(saved ?? 0);
  }

  protected onDiscountInput(event: Event): void {
    this.discountInput.set((event.target as HTMLInputElement).value);
  }

  saveDiscount(raw?: string): void {
    const c = this.customer();
    if (!c) return;
    const value = Number(raw ?? this.discountValue());
    const isAmount = this.mode() === 'amount';
    if (!Number.isFinite(value) || value < 0 || (!isAmount && value > 90)) {
      this.toast.error(isAmount ? 'Enter a valid amount.' : 'Enter a discount between 0 and 90%.');
      return;
    }
    this.savingDiscount.set(true);
    this.api.updateDiscount(c.id, isAmount ? 0 : value, isAmount ? value : 0).subscribe({
      next: () => {
        this.toast.success(
          value > 0 ? `${isAmount ? 'Rs ' + value : value + '%'} discount set for ${c.name}.` : 'Discount removed.',
        );
        this.discountInput.set(null);
        this.modeOverride.set(null);
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

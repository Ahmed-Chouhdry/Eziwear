import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ORDER_STATUS_LABEL, OrderStatus, PaymentStatus } from '../../../../core/models';
import { AdminOrderService } from '../../../../core/services/admin-order.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrderTimeline } from '../../../../shared/components/order-timeline/order-timeline';
import { UiSpinner } from '../../../../shared/components/ui-spinner/ui-spinner';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

@Component({
  selector: 'app-admin-order-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, PricePipe, OrderTimeline, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class AdminOrderDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AdminOrderService);
  private readonly toast = inject(ToastService);

  protected readonly statusLabel = ORDER_STATUS_LABEL;
  protected readonly updating = signal(false);

  protected readonly orderNumber = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('orderNumber') ?? '')),
    { initialValue: '' },
  );

  private readonly res = rxResource({
    params: () => this.orderNumber(),
    stream: ({ params }) => this.api.get(params),
  });

  protected readonly loading = computed(() => this.res.isLoading());
  protected readonly order = computed(() => this.res.value());

  protected readonly nextStatuses = computed<OrderStatus[]>(() => {
    const o = this.order();
    return o ? TRANSITIONS[o.orderStatus] : [];
  });

  // ---- Order discount (Rs or %) ----
  protected readonly discMode = signal<'amount' | 'percent'>('amount');
  protected readonly discInput = signal('');

  protected readonly canEditDiscount = computed(() => {
    const s = this.order()?.orderStatus;
    return s === 'pending' || s === 'confirmed' || s === 'processing';
  });

  /** The discount the admin has typed, converted to Rs and % of the subtotal. */
  protected readonly discPreview = computed(() => {
    const o = this.order();
    const raw = this.discInput().trim();
    if (!o || raw === '') return null;
    const v = Number(raw);
    if (!Number.isFinite(v) || v < 0) return null;
    const subtotal = o.subtotal;
    const amount = this.discMode() === 'percent' ? (subtotal * v) / 100 : v;
    if (amount > subtotal) return { valid: false as const, amount, percent: 0, newSubtotal: 0 };
    const round = (n: number) => Math.round(n * 100) / 100;
    return {
      valid: true as const,
      amount: round(amount),
      percent: subtotal > 0 ? round((amount / subtotal) * 100) : 0,
      newSubtotal: round(subtotal - amount),
    };
  });

  /** Effective % off for the discount currently saved on the order. */
  protected readonly currentPercent = computed(() => {
    const o = this.order();
    return o && o.subtotal > 0 ? Math.round((o.discount / o.subtotal) * 10000) / 100 : 0;
  });

  setDiscMode(m: 'amount' | 'percent'): void { this.discMode.set(m); this.discInput.set(''); }
  onDiscInput(e: Event): void { this.discInput.set((e.target as HTMLInputElement).value); }

  applyDiscount(): void {
    const o = this.order();
    const p = this.discPreview();
    if (!o || !p) return;
    if (!p.valid) {
      this.toast.error('Discount cannot be more than the order subtotal.');
      return;
    }
    this.updating.set(true);
    this.api.updateDiscount(o.orderNumber, this.discMode(), Number(this.discInput())).subscribe({
      next: () => {
        this.toast.success(`Discount set to Rs ${p.amount} (${p.percent}%).`);
        this.discInput.set('');
        this.res.reload();
      },
      error: () => this.updating.set(false),
      complete: () => this.updating.set(false),
    });
  }

  async setStatus(status: OrderStatus): Promise<void> {
    const o = this.order();
    if (!o) return;
    let note: string | undefined;
    if (status === 'cancelled' || status === 'returned') {
      note = prompt(`Add a note for marking this order "${status}" (optional):`) ?? undefined;
    }
    this.updating.set(true);
    this.api.updateStatus(o.orderNumber, status, note).subscribe({
      next: () => {
        this.toast.success(`Order marked ${this.statusLabel[status]}.`);
        this.res.reload();
      },
      error: () => this.updating.set(false),
      complete: () => this.updating.set(false),
    });
  }

  async setPaymentStatus(status: PaymentStatus): Promise<void> {
    const o = this.order();
    if (!o) return;
    this.updating.set(true);
    this.api.updatePaymentStatus(o.orderNumber, status).subscribe({
      next: () => {
        this.toast.success(`Payment marked ${status}.`);
        this.res.reload();
      },
      error: () => this.updating.set(false),
      complete: () => this.updating.set(false),
    });
  }
}

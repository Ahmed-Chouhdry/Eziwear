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

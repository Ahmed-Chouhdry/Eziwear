import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ORDER_STATUS_LABEL } from '../../../../core/models';
import { AdminOrderService } from '../../../../core/services/admin-order.service';
import { UiEmptyState } from '../../../../shared/components/ui-empty-state/ui-empty-state';
import { UiPagination } from '../../../../shared/components/ui-pagination/ui-pagination';
import { UiSkeleton } from '../../../../shared/components/ui-skeleton/ui-skeleton';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [RouterLink, DatePipe, PricePipe, UiPagination, UiEmptyState, UiSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-list.html',
  styleUrl: './order-list.scss',
})
export class OrderList {
  private readonly orders = inject(AdminOrderService);
  protected readonly statusLabel = ORDER_STATUS_LABEL;

  protected readonly search = signal('');
  protected readonly status = signal('');
  protected readonly paymentStatus = signal('');
  protected readonly page = signal(1);

  private readonly query = computed(() => ({
    search: this.search() || undefined,
    status: (this.status() || undefined) as never,
    paymentStatus: (this.paymentStatus() || undefined) as never,
    page: this.page(),
    pageSize: 15,
  }));

  private readonly res = rxResource({
    params: () => this.query(),
    stream: ({ params }) => this.orders.list(params),
  });

  protected readonly loading = computed(() => this.res.isLoading());
  protected readonly items = computed(() => this.res.value()?.items ?? []);
  protected readonly totalPages = computed(() => this.res.value()?.totalPages ?? 1);
  protected readonly total = computed(() => this.res.value()?.total ?? 0);
  protected readonly skeletons = [0, 1, 2, 3, 4];

  setSearch(v: string): void { this.search.set(v); this.page.set(1); }
  setStatus(v: string): void { this.status.set(v); this.page.set(1); }
  setPaymentStatus(v: string): void { this.paymentStatus.set(v); this.page.set(1); }
  goToPage(p: number): void { this.page.set(p); }

  statusClass(s: string): string {
    if (s === 'delivered') return 'pill--delivered';
    if (s === 'shipped') return 'pill--shipped';
    if (s === 'cancelled' || s === 'returned') return 'pill--cancelled';
    if (s === 'processing') return 'pill--processing';
    return 'pill--confirmed';
  }
}

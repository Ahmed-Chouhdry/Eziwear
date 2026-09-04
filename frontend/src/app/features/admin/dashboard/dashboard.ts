import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ORDER_STATUS_LABEL, OrderStatus } from '../../../core/models';
import { AdminService } from '../../../core/services/admin.service';
import { UiSkeleton } from '../../../shared/components/ui-skeleton/ui-skeleton';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { SalesChart } from '../sales-chart/sales-chart';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, PricePipe, SalesChart, UiSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly admin = inject(AdminService);

  label(s: string): string {
    return ORDER_STATUS_LABEL[s as OrderStatus] ?? s;
  }

  private readonly statsRes = rxResource({ stream: () => this.admin.stats() });
  private readonly salesRes = rxResource({ stream: () => this.admin.sales(14) });
  private readonly ordersRes = rxResource({ stream: () => this.admin.recentOrders(6) });
  private readonly lowStockRes = rxResource({ stream: () => this.admin.lowStock(8) });

  protected readonly loading = computed(() => this.statsRes.isLoading());
  protected readonly stats = computed(() => this.statsRes.value());
  protected readonly sales = computed(() => this.salesRes.value() ?? []);
  protected readonly recentOrders = computed(() => this.ordersRes.value() ?? []);
  protected readonly lowStock = computed(() => this.lowStockRes.value() ?? []);

  protected readonly cards = computed(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      { label: 'Revenue', value: `Rs ${format(s.revenue)}`, sub: `Rs ${format(s.revenueDelivered)} delivered`, tone: 'accent' as const },
      { label: 'Orders', value: format(s.orders.total), sub: `${s.orders.pending} pending`, tone: 'accent' as const },
      { label: 'Customers', value: format(s.customers), sub: '', tone: 'silver' as const },
      { label: 'VIP Products', value: format(s.vipProducts), sub: `${s.products} published`, tone: 'gold' as const },
      { label: 'Low Stock', value: format(s.lowStock), sub: `${s.outOfStock} out of stock`, tone: 'accent' as const },
    ];
  });

  statusClass(s: string): string {
    const status = s as OrderStatus;
    if (status === 'delivered') return 'pill--delivered';
    if (status === 'shipped') return 'pill--shipped';
    if (status === 'cancelled' || status === 'returned') return 'pill--cancelled';
    if (status === 'processing') return 'pill--processing';
    return 'pill--confirmed';
  }
}

function format(n: number): string {
  return new Intl.NumberFormat('en').format(Math.round(n));
}

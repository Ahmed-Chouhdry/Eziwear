import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ORDER_STATUS_LABEL } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { OrderService } from '../../../core/services/order.service';
import { QuickAddService } from '../../../core/services/quick-add.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { ProductRail } from '../../../shared/components/product-rail/product-rail';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import type { Product } from '../../../core/models';

@Component({
  selector: 'app-account-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, PricePipe, ProductRail],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class AccountDashboard {
  protected readonly auth = inject(AuthService);
  protected readonly wishlist = inject(WishlistService);
  private readonly orderApi = inject(OrderService);
  private readonly catalog = inject(CatalogService);
  private readonly quickAdd = inject(QuickAddService);

  protected readonly statusLabel = ORDER_STATUS_LABEL;

  private readonly orders = toSignal(this.orderApi.list(), { initialValue: null });
  protected readonly recentOrders = computed(() => (this.orders() ?? []).slice(0, 4));

  protected readonly stats = computed(() => {
    const list = this.orders() ?? [];
    return {
      total: list.length,
      pending: list.filter((o) => ['pending', 'confirmed', 'processing'].includes(o.orderStatus)).length,
      delivered: list.filter((o) => o.orderStatus === 'delivered').length,
      wishlist: this.wishlist.count(),
    };
  });

  protected readonly recommended = toSignal(this.catalog.getBestSellers(4), { initialValue: null });
  protected readonly recommendedList = computed(() => this.recommended() ?? []);

  protected readonly firstName = computed(() => this.auth.user()?.name.split(' ')[0] ?? 'there');

  onAdd(p: Product): void {
    this.quickAdd.add(p);
  }
}

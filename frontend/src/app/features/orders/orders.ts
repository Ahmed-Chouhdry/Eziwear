import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ORDER_STATUS_LABEL, OrderStatus } from '../../core/models';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { UiEmptyState } from '../../shared/components/ui-empty-state/ui-empty-state';
import { UiSkeleton } from '../../shared/components/ui-skeleton/ui-skeleton';
import { PricePipe } from '../../shared/pipes/price.pipe';

const TRACKABLE: OrderStatus[] = ['confirmed', 'processing', 'shipped'];

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [RouterLink, DatePipe, PricePipe, UiEmptyState, UiSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class Orders {
  private readonly orderApi = inject(OrderService);
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly statusLabel = ORDER_STATUS_LABEL;

  private readonly res = rxResource({ stream: () => this.orderApi.list() });
  protected readonly loading = computed(() => this.res.isLoading());
  protected readonly orders = computed(() => this.res.value() ?? []);

  protected readonly reordering = signal<string | null>(null);

  protected isDelivered(s: OrderStatus): boolean {
    return s === 'delivered';
  }
  protected canTrack(s: OrderStatus): boolean {
    return TRACKABLE.includes(s);
  }

  protected async reorder(orderNumber: string): Promise<void> {
    this.reordering.set(orderNumber);
    try {
      const order = await firstValueFrom(this.orderApi.get(orderNumber));
      let added = 0;
      for (const item of order.items) {
        if (item.productId == null || item.variantId == null) continue;
        try {
          await this.cart.add(
            {
              productId: item.productId,
              variantId: item.variantId,
              name: item.productName,
              slug: item.slug ?? '',
              image: item.image ?? null,
              size: item.size,
              color: item.color,
              unitPrice: item.unitPrice,
              maxStock: 99,
            },
            item.quantity,
          );
          added++;
        } catch {
          /* item unavailable — skip */
        }
      }
      if (added > 0) {
        this.toast.success(`${added} item${added === 1 ? '' : 's'} added to your cart.`);
        void this.router.navigate(['/cart']);
      } else {
        this.toast.error('None of those items are available right now.');
      }
    } catch {
      /* interceptor surfaced it */
    } finally {
      this.reordering.set(null);
    }
  }
}

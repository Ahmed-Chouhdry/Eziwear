import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ORDER_STATUS_LABEL } from '../../core/models';
import { OrderService } from '../../core/services/order.service';
import { UiEmptyState } from '../../shared/components/ui-empty-state/ui-empty-state';
import { UiSkeleton } from '../../shared/components/ui-skeleton/ui-skeleton';
import { PricePipe } from '../../shared/pipes/price.pipe';

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
  protected readonly statusLabel = ORDER_STATUS_LABEL;

  private readonly res = rxResource({ stream: () => this.orderApi.list() });
  protected readonly loading = computed(() => this.res.isLoading());
  protected readonly orders = computed(() => this.res.value() ?? []);
}

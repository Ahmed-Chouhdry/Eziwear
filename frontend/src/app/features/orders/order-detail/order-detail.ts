import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ORDER_STATUS_LABEL } from '../../../core/models';
import { OrderService } from '../../../core/services/order.service';
import { OrderTimeline } from '../../../shared/components/order-timeline/order-timeline';
import { UiSpinner } from '../../../shared/components/ui-spinner/ui-spinner';
import { PricePipe } from '../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, PricePipe, OrderTimeline, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly orderApi = inject(OrderService);

  protected readonly statusLabel = ORDER_STATUS_LABEL;

  protected readonly orderNumber = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('orderNumber') ?? '')),
    { initialValue: '' },
  );
  protected readonly justPlaced = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('placed') === '1')),
    { initialValue: false },
  );

  private readonly res = rxResource({
    params: () => this.orderNumber(),
    stream: ({ params }) => this.orderApi.get(params),
  });

  protected readonly loading = computed(() => this.res.isLoading());
  protected readonly error = computed(() => this.res.error() != null);
  protected readonly order = computed(() => this.res.value());
}

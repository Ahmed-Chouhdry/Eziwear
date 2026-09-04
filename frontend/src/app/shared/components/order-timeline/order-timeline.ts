import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABEL, OrderStatus } from '../../../core/models';

@Component({
  selector: 'order-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isTerminal()) {
      <p class="ot-terminal" [class.ot-terminal--bad]="status() === 'cancelled' || status() === 'returned'">
        This order is {{ label(status()) }}.
      </p>
    } @else {
      <ol class="ot" role="list">
        @for (step of steps(); track step.status) {
          <li class="ot-step" [class.is-done]="step.done" [class.is-current]="step.current">
            <span class="ot-dot" aria-hidden="true"></span>
            <span class="ot-label">{{ label(step.status) }}</span>
          </li>
        }
      </ol>
    }
  `,
  styleUrl: './order-timeline.scss',
})
export class OrderTimeline {
  readonly status = input.required<OrderStatus>();

  protected readonly isTerminal = computed(
    () => this.status() === 'cancelled' || this.status() === 'returned',
  );

  protected readonly steps = computed(() => {
    const current = this.status();
    const idx = ORDER_STATUS_FLOW.indexOf(current);
    return ORDER_STATUS_FLOW.map((status, i) => ({
      status,
      done: i < idx,
      current: i === idx,
    }));
  });

  protected label(s: OrderStatus): string {
    return ORDER_STATUS_LABEL[s];
  }
}

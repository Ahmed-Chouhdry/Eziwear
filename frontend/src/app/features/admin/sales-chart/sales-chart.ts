import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SalesPoint } from '../../../core/services/admin.service';

@Component({
  selector: 'admin-sales-chart',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data().length) {
      <div class="sc">
        <div class="sc__bars" role="img" [attr.aria-label]="'Daily revenue, last ' + data().length + ' days'">
          @for (bar of bars(); track bar.date) {
            <div class="sc__col" [title]="bar.label">
              <div class="sc__bar" [style.height.%]="bar.pct" [class.sc__bar--empty]="bar.value === 0"></div>
              <span class="sc__tick">{{ bar.day }}</span>
            </div>
          }
        </div>
        <div class="sc__meta">
          <span>Peak: Rs {{ peak() | number: '1.0-0' }}</span>
          <span>Total: Rs {{ total() | number: '1.0-0' }}</span>
        </div>
      </div>
    } @else {
      <p class="sc__empty">No sales data yet.</p>
    }
  `,
  styleUrl: './sales-chart.scss',
})
export class SalesChart {
  readonly data = input<SalesPoint[]>([]);

  protected readonly peak = computed(() => Math.max(0, ...this.data().map((d) => d.total)));
  protected readonly total = computed(() => this.data().reduce((s, d) => s + d.total, 0));

  protected readonly bars = computed(() => {
    const max = this.peak() || 1;
    return this.data().map((d) => {
      const date = new Date(d.date);
      return {
        date: d.date,
        value: d.total,
        pct: Math.max(d.total > 0 ? 4 : 1.5, (d.total / max) * 100),
        day: date.toLocaleDateString('en', { day: 'numeric' }),
        label: `${date.toLocaleDateString('en', { month: 'short', day: 'numeric' })} · Rs ${Math.round(d.total)} · ${d.orders} order${d.orders === 1 ? '' : 's'}`,
      };
    });
  });
}

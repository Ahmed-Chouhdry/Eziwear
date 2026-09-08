import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { RETURN_STATUS_LABEL, ReturnService } from '../../../core/services/return.service';
import { UiEmptyState } from '../../../shared/components/ui-empty-state/ui-empty-state';
import { UiSkeleton } from '../../../shared/components/ui-skeleton/ui-skeleton';

@Component({
  selector: 'app-returns-list',
  standalone: true,
  imports: [RouterLink, DatePipe, UiEmptyState, UiSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="rl__title">My Returns</h1>

    @if (loading()) {
      <div class="rl__list">
        @for (i of [1, 2]; track i) {
          <div class="rl__row"><ui-skeleton shape="text" width="40%" /><ui-skeleton shape="text" width="60%" /></div>
        }
      </div>
    } @else if (rows().length === 0) {
      <ui-empty-state icon="⟲" title="No return requests" message="Returns you request from a delivered order show up here.">
        <a class="btn btn--primary" routerLink="/account/orders">View orders</a>
      </ui-empty-state>
    } @else {
      <div class="rl__list">
        @for (r of rows(); track r.id) {
          <a class="rl__row" [routerLink]="['/account/returns', r.id]">
            <div>
              <strong>Return #{{ r.id }}</strong>
              <span class="text-muted"> · Order {{ r.orderNumber }}</span>
              <div class="text-muted rl__meta">Requested {{ r.requestedAt | date: 'mediumDate' }} · {{ r.resolutionType }}</div>
            </div>
            <span class="badge"
              [class.badge--in-stock]="r.status === 'refunded' || r.status === 'closed' || r.status === 'exchanged'"
              [class.badge--out-stock]="r.status === 'rejected' || r.status === 'cancelled'"
              [class.badge--sale]="!['refunded','closed','exchanged','rejected','cancelled'].includes(r.status)">
              {{ label[r.status] }}
            </span>
          </a>
        }
      </div>
    }
  `,
  styles: [
    `
      .rl__title { font-size: var(--fs-2xl); text-transform: uppercase; margin-bottom: var(--sp-5); }
      .rl__list { display: flex; flex-direction: column; gap: var(--sp-3); }
      .rl__row {
        display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3);
        padding: var(--sp-4); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);
      }
      .rl__row:hover { border-color: var(--border-hover); }
      .rl__meta { font-size: var(--fs-xs); margin-top: 2px; }
    `,
  ],
})
export class ReturnsList {
  private readonly api = inject(ReturnService);
  protected readonly label = RETURN_STATUS_LABEL;

  private readonly res = rxResource({ stream: () => this.api.listMine() });
  protected readonly loading = computed(() => this.res.isLoading());
  protected readonly rows = computed(() => this.res.value()?.items ?? []);
}

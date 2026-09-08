import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  RETURN_STATUS_LABEL,
  ReturnService,
  ReturnStatus,
} from '../../../../core/services/return.service';
import { UiSkeleton } from '../../../../shared/components/ui-skeleton/ui-skeleton';

const STATUSES = Object.keys(RETURN_STATUS_LABEL) as ReturnStatus[];

@Component({
  selector: 'app-admin-return-list',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, UiSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="arl">
      <header class="arl__head">
        <h1>Returns</h1>
        <p class="text-muted">{{ loading() ? 'Loading…' : total() + ' request' + (total() === 1 ? '' : 's') }}</p>
      </header>

      <div class="arl__filters">
        <input class="input" placeholder="Search order # or customer…" [ngModel]="search()" (ngModelChange)="onSearch($event)" />
        <select class="select" [ngModel]="status()" (ngModelChange)="status.set($event)">
          <option value="">All statuses</option>
          @for (s of statuses; track s) { <option [value]="s">{{ label[s] }}</option> }
        </select>
      </div>

      @if (loading()) {
        <div class="arl__list">@for (i of [1,2,3]; track i) { <div class="arl__row"><ui-skeleton shape="text" width="60%" /></div> }</div>
      } @else if (rows().length === 0) {
        <p class="text-muted arl__empty">No return requests match.</p>
      } @else {
        <div class="arl__list">
          @for (r of rows(); track r.id) {
            <a class="arl__row" [routerLink]="['/admin/returns', r.id]">
              <span><strong>#{{ r.id }}</strong> · {{ r.orderNumber }}</span>
              <span class="arl__cust">{{ r.customerName }}</span>
              <span class="text-muted">{{ r.requestedAt | date: 'mediumDate' }}</span>
              <span class="badge"
                [class.badge--in-stock]="['refunded','closed','exchanged'].includes(r.status)"
                [class.badge--out-stock]="['rejected','cancelled'].includes(r.status)"
                [class.badge--sale]="!['refunded','closed','exchanged','rejected','cancelled'].includes(r.status)">
                {{ label[r.status] }}
              </span>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .arl__head h1 { font-size: var(--fs-2xl); text-transform: uppercase; }
      .arl__filters { display: flex; flex-wrap: wrap; gap: var(--sp-3); margin: var(--sp-4) 0; }
      .arl__filters .input { max-width: 320px; }
      .arl__filters .select { max-width: 220px; }
      .arl__list { display: flex; flex-direction: column; gap: var(--sp-2); }
      .arl__row {
        display: grid; grid-template-columns: 1.4fr 1fr auto auto; gap: var(--sp-3); align-items: center;
        padding: var(--sp-3) var(--sp-4); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm);
      }
      .arl__row:hover { border-color: var(--border-hover); }
      .arl__cust { font-size: var(--fs-sm); }
      .arl__empty { padding: var(--sp-6) 0; }
      @media (max-width: 720px) { .arl__row { grid-template-columns: 1fr auto; } .arl__cust, .arl__row .text-muted { display: none; } }
    `,
  ],
})
export class AdminReturnList {
  private readonly api = inject(ReturnService);
  protected readonly label = RETURN_STATUS_LABEL;
  protected readonly statuses: ReturnStatus[] = STATUSES;

  protected readonly search = signal('');
  protected readonly status = signal('');
  private searchTimer?: ReturnType<typeof setTimeout>;

  private readonly res = rxResource({
    params: () => ({ search: this.search(), status: this.status() }),
    stream: ({ params }) => this.api.adminList(params),
  });
  protected readonly loading = computed(() => this.res.isLoading());
  protected readonly rows = computed(() => this.res.value()?.items ?? []);
  protected readonly total = computed(() => this.res.value()?.total ?? 0);

  onSearch(v: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.search.set(v), 300);
  }
}

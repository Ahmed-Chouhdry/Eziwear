import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminReviewListItem, AdminReviewService, ReviewStatus } from '../../../core/services/admin-review.service';
import { ToastService } from '../../../core/services/toast.service';
import { UiEmptyState } from '../../../shared/components/ui-empty-state/ui-empty-state';
import { UiPagination } from '../../../shared/components/ui-pagination/ui-pagination';
import { UiSkeleton } from '../../../shared/components/ui-skeleton/ui-skeleton';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [RouterLink, DatePipe, UiPagination, UiEmptyState, UiSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reviews.html',
  styleUrl: './reviews.scss',
})
export class Reviews {
  private readonly api = inject(AdminReviewService);
  private readonly toast = inject(ToastService);

  protected readonly search = signal('');
  protected readonly status = signal<ReviewStatus | ''>('pending');
  protected readonly page = signal(1);

  private readonly query = computed(() => ({
    search: this.search() || undefined,
    status: (this.status() || undefined) as never,
    page: this.page(),
    pageSize: 15,
  }));

  private readonly res = rxResource({ params: () => this.query(), stream: ({ params }) => this.api.list(params) });

  protected readonly loading = computed(() => this.res.isLoading());
  protected readonly items = computed(() => this.res.value()?.items ?? []);
  protected readonly totalPages = computed(() => this.res.value()?.totalPages ?? 1);
  protected readonly total = computed(() => this.res.value()?.total ?? 0);
  protected readonly skeletons = [0, 1, 2, 3];
  protected readonly busyId = signal<number | null>(null);

  setSearch(v: string): void { this.search.set(v); this.page.set(1); }
  setStatus(v: string): void { this.status.set(v as ReviewStatus | ''); this.page.set(1); }
  goToPage(p: number): void { this.page.set(p); }

  stars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  async approve(r: AdminReviewListItem): Promise<void> {
    this.busyId.set(r.id);
    try {
      await firstValueFrom(this.api.updateStatus(r.id, 'approved'));
      this.toast.success('Review approved — now live on the product page.');
      this.res.reload();
    } finally {
      this.busyId.set(null);
    }
  }

  async reject(r: AdminReviewListItem): Promise<void> {
    this.busyId.set(r.id);
    try {
      await firstValueFrom(this.api.updateStatus(r.id, 'rejected'));
      this.toast.success('Review rejected.');
      this.res.reload();
    } finally {
      this.busyId.set(null);
    }
  }

  async remove(r: AdminReviewListItem): Promise<void> {
    if (!confirm(`Permanently delete this review by ${r.customerName}?`)) return;
    this.busyId.set(r.id);
    try {
      await firstValueFrom(this.api.remove(r.id));
      this.toast.success('Review deleted.');
      this.res.reload();
    } finally {
      this.busyId.set(null);
    }
  }
}

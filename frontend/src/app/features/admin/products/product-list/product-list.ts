import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminProductService } from '../../../../core/services/admin-product.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UiEmptyState } from '../../../../shared/components/ui-empty-state/ui-empty-state';
import { UiPagination } from '../../../../shared/components/ui-pagination/ui-pagination';
import { UiSkeleton } from '../../../../shared/components/ui-skeleton/ui-skeleton';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [RouterLink, PricePipe, UiPagination, UiEmptyState, UiSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {
  private readonly products = inject(AdminProductService);
  private readonly toast = inject(ToastService);
  private readonly confirmSvc = inject(ConfirmService);

  protected readonly search = signal('');
  protected readonly status = signal<string>('');
  protected readonly page = signal(1);
  protected readonly deletingId = signal<number | null>(null);

  private readonly query = computed(() => ({
    search: this.search() || undefined,
    status: (this.status() || undefined) as never,
    page: this.page(),
    pageSize: 12,
  }));

  private readonly res = rxResource({
    params: () => this.query(),
    stream: ({ params }) => this.products.list(params),
  });

  protected readonly loading = computed(() => this.res.isLoading());
  protected readonly items = computed(() => this.res.value()?.items ?? []);
  protected readonly totalPages = computed(() => this.res.value()?.totalPages ?? 1);
  protected readonly total = computed(() => this.res.value()?.total ?? 0);
  protected readonly skeletons = [0, 1, 2, 3, 4, 5];

  setSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  setStatus(value: string): void {
    this.status.set(value);
    this.page.set(1);
  }

  goToPage(p: number): void {
    this.page.set(p);
  }

  async togglePublish(id: number, current: string): Promise<void> {
    const next = current === 'published' ? 'draft' : 'published';
    try {
      await firstValueFrom(this.products.update(id, { status: next as never }));
      this.toast.success(next === 'published' ? 'Product published.' : 'Product unpublished.');
      this.res.reload();
    } catch {
      /* interceptor surfaced it */
    }
  }

  async remove(id: number, name: string): Promise<void> {
    const ok = await this.confirmSvc.confirm({
      message: `Delete "${name}"? This can't be undone if it has no order history.`,
      danger: true,
    });
    if (!ok) return;
    this.deletingId.set(id);
    try {
      const result = await firstValueFrom(this.products.hardDelete(id));
      this.toast.success(
        result.archived
          ? `${name} has past orders — archived instead of deleted.`
          : `${name} deleted.`,
      );
      this.res.reload();
    } catch {
      /* interceptor surfaced it */
    } finally {
      this.deletingId.set(null);
    }
  }
}

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AdminCustomerService } from '../../../../core/services/admin-customer.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UiEmptyState } from '../../../../shared/components/ui-empty-state/ui-empty-state';
import { UiPagination } from '../../../../shared/components/ui-pagination/ui-pagination';
import { UiSkeleton } from '../../../../shared/components/ui-skeleton/ui-skeleton';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [RouterLink, DatePipe, PricePipe, UiPagination, UiEmptyState, UiSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.scss',
})
export class CustomerList {
  private readonly customers = inject(AdminCustomerService);
  private readonly toast = inject(ToastService);

  /** 'registered' = accounts, 'guests' = guest-checkout shoppers (no account). */
  protected readonly tab = signal<'registered' | 'guests'>('registered');
  protected readonly search = signal('');
  protected readonly status = signal('');
  protected readonly page = signal(1);
  protected readonly savingEmail = signal<string | null>(null);

  private readonly query = computed(() => ({
    search: this.search() || undefined,
    status: (this.status() || undefined) as never,
    page: this.page(),
    pageSize: 15,
  }));

  private readonly res = rxResource({
    params: () => (this.tab() === 'registered' ? this.query() : undefined),
    stream: ({ params }) => this.customers.list(params),
  });

  private readonly guestRes = rxResource({
    params: () => (this.tab() === 'guests' ? this.query() : undefined),
    stream: ({ params }) => this.customers.listGuests({ search: params.search, page: params.page, pageSize: params.pageSize }),
  });

  private readonly active = computed(() => (this.tab() === 'registered' ? this.res : this.guestRes));

  protected readonly loading = computed(() => this.active().isLoading());
  protected readonly items = computed(() => this.res.value()?.items ?? []);
  protected readonly guests = computed(() => this.guestRes.value()?.items ?? []);
  protected readonly totalPages = computed(() => this.active().value()?.totalPages ?? 1);
  protected readonly total = computed(() => this.active().value()?.total ?? 0);
  protected readonly skeletons = [0, 1, 2, 3, 4];
  protected readonly presets = [5, 10, 15, 20];

  setTab(t: 'registered' | 'guests'): void { this.tab.set(t); this.page.set(1); }
  setSearch(v: string): void { this.search.set(v); this.page.set(1); }
  setStatus(v: string): void { this.status.set(v); this.page.set(1); }
  goToPage(p: number): void { this.page.set(p); }

  saveGuestDiscount(email: string, raw: string): void {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 90) {
      this.toast.error('Enter a discount between 0 and 90%.');
      return;
    }
    this.savingEmail.set(email);
    this.customers.updateGuestDiscount(email, value).subscribe({
      next: () => {
        this.toast.success(value > 0 ? `${value}% discount set for ${email}.` : 'Discount removed.');
        this.guestRes.reload();
      },
      error: () => this.savingEmail.set(null),
      complete: () => this.savingEmail.set(null),
    });
  }
}

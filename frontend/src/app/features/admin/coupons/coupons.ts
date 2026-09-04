import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  AdminCoupon,
  AdminCouponService,
  CouponPayload,
} from '../../../core/services/admin-coupon.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { UiEmptyState } from '../../../shared/components/ui-empty-state/ui-empty-state';
import { UiPagination } from '../../../shared/components/ui-pagination/ui-pagination';
import { UiSkeleton } from '../../../shared/components/ui-skeleton/ui-skeleton';
import { PricePipe } from '../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-coupons',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, PricePipe, UiPagination, UiEmptyState, UiSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './coupons.html',
  styleUrl: './coupons.scss',
})
export class Coupons {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirmSvc = inject(ConfirmService);
  private readonly api = inject(AdminCouponService);

  protected readonly search = signal('');
  protected readonly status = signal('');
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

  setSearch(v: string): void { this.search.set(v); this.page.set(1); }
  setStatus(v: string): void { this.status.set(v); this.page.set(1); }
  goToPage(p: number): void { this.page.set(p); }

  protected readonly editingId = signal<number | 'new' | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(3)]],
    type: ['percentage' as CouponPayload['type']],
    value: [10, [Validators.required, Validators.min(0.01)]],
    minOrder: [0],
    maxDiscount: [0],
    startAt: [''],
    endAt: [''],
    usageLimit: [0],
    status: ['active' as 'active' | 'inactive'],
  });

  startAdd(): void {
    this.form.reset({ type: 'percentage', value: 10, minOrder: 0, maxDiscount: 0, usageLimit: 0, status: 'active' });
    this.editingId.set('new');
  }

  startEdit(c: AdminCoupon): void {
    this.form.reset({
      code: c.code,
      type: c.type,
      value: c.value,
      minOrder: c.minOrder ?? 0,
      maxDiscount: c.maxDiscount ?? 0,
      startAt: c.startAt ? c.startAt.slice(0, 10) : '',
      endAt: c.endAt ? c.endAt.slice(0, 10) : '',
      usageLimit: c.usageLimit ?? 0,
      status: c.status,
    });
    this.editingId.set(c.id);
  }

  cancel(): void {
    this.editingId.set(null);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload: CouponPayload = {
      code: v.code,
      type: v.type,
      value: v.value,
      minOrder: v.minOrder > 0 ? v.minOrder : undefined,
      maxDiscount: v.maxDiscount > 0 ? v.maxDiscount : undefined,
      startAt: v.startAt || undefined,
      endAt: v.endAt || undefined,
      usageLimit: v.usageLimit > 0 ? v.usageLimit : undefined,
      status: v.status,
    };
    this.saving.set(true);
    try {
      const id = this.editingId();
      if (id === 'new') {
        await firstValueFrom(this.api.create(payload));
        this.toast.success('Coupon created.');
      } else if (typeof id === 'number') {
        await firstValueFrom(this.api.update(id, payload));
        this.toast.success('Coupon updated.');
      }
      this.editingId.set(null);
      this.res.reload();
    } catch {
      /* interceptor surfaced it */
    } finally {
      this.saving.set(false);
    }
  }

  async toggleStatus(c: AdminCoupon): Promise<void> {
    await firstValueFrom(this.api.update(c.id, { status: c.status === 'active' ? 'inactive' : 'active' }));
    this.res.reload();
  }

  async remove(c: AdminCoupon): Promise<void> {
    if (!(await this.confirmSvc.confirm({ message: `Delete coupon "${c.code}"?`, danger: true }))) return;
    await firstValueFrom(this.api.remove(c.id));
    this.toast.success('Coupon deleted.');
    this.res.reload();
  }
}

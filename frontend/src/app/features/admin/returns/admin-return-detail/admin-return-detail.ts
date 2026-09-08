import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { RETURN_STATUS_LABEL, ReturnService } from '../../../../core/services/return.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ReturnTimeline } from '../../../../shared/components/return-timeline/return-timeline';
import { UiSpinner } from '../../../../shared/components/ui-spinner/ui-spinner';
import { PricePipe } from '../../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-admin-return-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, PricePipe, ReturnTimeline, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-return-detail.html',
  styleUrl: './admin-return-detail.scss',
})
export class AdminReturnDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ReturnService);
  private readonly toast = inject(ToastService);

  protected readonly label = RETURN_STATUS_LABEL;
  protected readonly id = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('id')))), { initialValue: 0 });
  protected readonly busy = signal(false);
  protected readonly rejectReason = signal('');
  protected readonly notes = signal('');
  protected readonly refundMethod = signal('store_credit');

  private readonly res = rxResource({ params: () => this.id(), stream: ({ params }) => this.api.adminGet(params) });
  protected readonly loading = computed(() => this.res.isLoading());
  protected readonly r = computed(() => this.res.value());

  // state helpers mirroring the backend machine
  protected readonly canApprove = computed(() => this.r()?.status === 'requested');
  protected readonly canReject = computed(() => this.r()?.status === 'requested');
  protected readonly canPickup = computed(() => this.r()?.status === 'approved');
  protected readonly canReceive = computed(() => ['approved', 'awaiting_pickup'].includes(this.r()?.status ?? ''));
  protected readonly canInspect = computed(() => ['received', 'inspected'].includes(this.r()?.status ?? ''));
  protected readonly canRefund = computed(
    () => this.r()?.status === 'inspected' && (this.r()?.items ?? []).every((i) => i.itemStatus !== 'pending'),
  );

  private async run(fn: () => Promise<unknown>): Promise<void> {
    this.busy.set(true);
    try {
      await fn();
      this.res.reload();
    } catch {
      /* interceptor surfaces the API validation error */
    } finally {
      this.busy.set(false);
    }
  }

  approve() { return this.run(() => firstValueFrom(this.api.approve(this.id()))); }
  reject() {
    if (this.rejectReason().trim().length < 3) { this.toast.error('Add a rejection reason.'); return; }
    return this.run(() => firstValueFrom(this.api.reject(this.id(), this.rejectReason())));
  }
  logistics(s: string) { return this.run(() => firstValueFrom(this.api.logistics(this.id(), s))); }
  inspect(itemId: number, st: 'accepted' | 'rejected', notes: string) {
    return this.run(() => firstValueFrom(this.api.inspectItem(this.id(), itemId, st, notes || undefined)));
  }
  refund() { return this.run(() => firstValueFrom(this.api.refund(this.id(), this.refundMethod()))); }
  saveNotes() { return this.run(() => firstValueFrom(this.api.setNotes(this.id(), this.notes()))); }
}

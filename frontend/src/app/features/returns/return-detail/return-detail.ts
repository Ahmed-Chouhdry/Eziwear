import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { RETURN_STATUS_LABEL, ReturnService } from '../../../core/services/return.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { ReturnTimeline } from '../../../shared/components/return-timeline/return-timeline';
import { UiSpinner } from '../../../shared/components/ui-spinner/ui-spinner';
import { PricePipe } from '../../../shared/pipes/price.pipe';

@Component({
  selector: 'app-return-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, PricePipe, ReturnTimeline, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './return-detail.html',
  styleUrl: './return-detail.scss',
})
export class ReturnDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ReturnService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly label = RETURN_STATUS_LABEL;
  protected readonly id = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('id')))), { initialValue: 0 });
  protected readonly cancelling = signal(false);

  private readonly res = rxResource({ params: () => this.id(), stream: ({ params }) => this.api.getMine(params) });
  protected readonly loading = computed(() => this.res.isLoading());
  protected readonly r = computed(() => this.res.value());

  async cancel(): Promise<void> {
    if (!(await this.confirm.confirm({ message: 'Cancel this return request?', danger: true }))) return;
    this.cancelling.set(true);
    try {
      await firstValueFrom(this.api.cancel(this.id()));
      this.toast.success('Return request cancelled.');
      this.res.reload();
    } catch {
      /* interceptor */
    } finally {
      this.cancelling.set(false);
    }
  }
}

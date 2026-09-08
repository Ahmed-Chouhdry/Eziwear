import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import {
  CreateReturnPayload,
  RETURN_REASONS,
  ReturnService,
} from '../../../core/services/return.service';
import { ToastService } from '../../../core/services/toast.service';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { UiSpinner } from '../../../shared/components/ui-spinner/ui-spinner';

interface LineForm {
  selected: boolean;
  quantity: number;
  reason: string;
  comment: string;
}

@Component({
  selector: 'app-return-request',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, PricePipe, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './return-request.html',
  styleUrl: './return-request.scss',
})
export class ReturnRequest {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ReturnService);
  private readonly toast = inject(ToastService);

  protected readonly reasons = RETURN_REASONS;
  protected readonly orderId = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('orderId')))), {
    initialValue: 0,
  });

  private readonly res = rxResource({
    params: () => this.orderId(),
    stream: ({ params }) => this.api.eligibility(params),
  });
  protected readonly loading = computed(() => this.res.isLoading());
  protected readonly elig = computed(() => this.res.value());

  protected readonly resolution = signal<'refund' | 'exchange'>('refund');
  protected readonly submitting = signal(false);
  protected readonly uploading = signal(false);
  protected readonly photos = signal<string[]>([]);
  protected readonly lines = signal<Record<number, LineForm>>({});

  protected line(id: number): LineForm {
    return this.lines()[id] ?? { selected: false, quantity: 1, reason: '', comment: '' };
  }
  protected patchLine(id: number, patch: Partial<LineForm>): void {
    this.lines.update((m) => ({ ...m, [id]: { ...this.line(id), ...patch } }));
  }

  protected readonly chosen = computed(() =>
    (this.elig()?.items ?? []).filter((i) => this.line(i.orderItemId).selected),
  );
  protected readonly canSubmit = computed(
    () =>
      this.chosen().length > 0 &&
      this.chosen().every((i) => {
        const l = this.line(i.orderItemId);
        return l.reason && l.quantity >= 1 && l.quantity <= i.returnableQuantity;
      }),
  );

  async onPhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    if (this.photos().length >= 4) {
      this.toast.error('Up to 4 photos.');
      return;
    }
    this.uploading.set(true);
    try {
      const url = await firstValueFrom(this.api.uploadPhoto(file));
      this.photos.update((p) => [...p, url]);
    } catch {
      /* interceptor */
    } finally {
      this.uploading.set(false);
    }
  }
  removePhoto(url: string): void {
    this.photos.update((p) => p.filter((u) => u !== url));
  }

  async submit(): Promise<void> {
    if (!this.canSubmit() || this.submitting()) return;
    const payload: CreateReturnPayload = {
      resolution_type: this.resolution(),
      items: this.chosen().map((i, idx) => {
        const l = this.line(i.orderItemId);
        return {
          order_item_id: i.orderItemId,
          quantity: l.quantity,
          reason: l.reason,
          comment: l.comment || undefined,
          photo_url: this.photos()[idx] ?? this.photos()[0] ?? undefined,
        };
      }),
    };
    this.submitting.set(true);
    try {
      const created = await firstValueFrom(this.api.create(this.orderId(), payload));
      this.toast.success('Return request submitted.');
      void this.router.navigate(['/account/returns', created.id]);
    } catch {
      /* interceptor surfaced the API validation error */
    } finally {
      this.submitting.set(false);
    }
  }
}

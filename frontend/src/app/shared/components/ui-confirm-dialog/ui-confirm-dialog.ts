import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';
import { UiModal } from '../ui-modal/ui-modal';

/**
 * Single global instance mounted in the app root — reads ConfirmService's
 * state signal and renders whatever confirmation is currently pending.
 */
@Component({
  selector: 'ui-confirm-dialog',
  standalone: true,
  imports: [UiModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal
      [open]="!!state()"
      [title]="state()?.title || 'Are you sure?'"
      [hasFooter]="true"
      [closeOnBackdrop]="false"
      (closed)="cancel()"
    >
      <p class="ui-confirm__msg">{{ state()?.message }}</p>
      <div modalFooter class="ui-confirm__actions">
        <button class="btn btn--ghost" type="button" (click)="cancel()">
          {{ state()?.cancelText || 'Cancel' }}
        </button>
        <button
          class="btn"
          [class.btn--danger]="state()?.danger"
          [class.btn--primary]="!state()?.danger"
          type="button"
          (click)="ok()"
        >
          {{ state()?.confirmText || (state()?.danger ? 'Delete' : 'Confirm') }}
        </button>
      </div>
    </ui-modal>
  `,
  styles: [
    `
      .ui-confirm__msg {
        color: var(--text-muted);
        line-height: 1.6;
      }
      .ui-confirm__actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--sp-3);
        width: 100%;
      }
    `,
  ],
})
export class UiConfirmDialog {
  private readonly svc = inject(ConfirmService);
  protected readonly state = this.svc.state;

  ok(): void {
    this.svc.respond(true);
  }
  cancel(): void {
    this.svc.respond(false);
  }
}

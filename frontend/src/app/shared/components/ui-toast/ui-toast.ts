import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'ui-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-toast-stack" aria-live="polite" aria-atomic="true">
      @for (t of toast.toasts(); track t.id) {
        <div class="ui-toast ui-toast--{{ t.kind }}" role="status">
          <span class="ui-toast__dot" aria-hidden="true"></span>
          <div class="ui-toast__body">
            @if (t.title) { <strong class="ui-toast__title">{{ t.title }}</strong> }
            <span class="ui-toast__msg">{{ t.message }}</span>
          </div>
          <button class="ui-toast__close" (click)="toast.dismiss(t.id)" aria-label="Dismiss">
            &times;
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .ui-toast-stack {
        position: fixed;
        inset-block-end: var(--sp-5);
        inset-inline-end: var(--sp-5);
        display: flex;
        flex-direction: column;
        gap: var(--sp-3);
        z-index: var(--z-toast);
        max-width: min(380px, calc(100vw - 2 * var(--sp-4)));
      }
      @media (max-width: 480px) {
        .ui-toast-stack {
          inset-inline: var(--sp-4);
          inset-block-end: var(--sp-4);
          max-width: none;
        }
      }
      .ui-toast {
        display: flex;
        align-items: flex-start;
        gap: var(--sp-3);
        padding: var(--sp-3) var(--sp-4);
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        animation: ezi-fade-up var(--dur-base) var(--ease-out);
      }
      .ui-toast__dot {
        margin-top: 6px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .ui-toast--success .ui-toast__dot { background: var(--status-success); }
      .ui-toast--error .ui-toast__dot { background: var(--status-error); }
      .ui-toast--info .ui-toast__dot { background: var(--accent); }
      .ui-toast__body { display: flex; flex-direction: column; gap: 2px; flex: 1; font-size: var(--fs-sm); }
      .ui-toast__title { font-family: var(--font-display); font-size: var(--fs-sm); }
      .ui-toast__msg { color: var(--text-muted); }
      .ui-toast__close {
        color: var(--text-faint);
        font-size: 20px;
        line-height: 1;
        padding: 0 4px;
      }
      .ui-toast__close:hover { color: var(--text); }
    `,
  ],
})
export class UiToast {
  protected readonly toast = inject(ToastService);
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Inline loading spinner for buttons, cards and section placeholders. */
@Component({
  selector: 'ui-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="ui-spinner"
      [style.--size.px]="size()"
      [class.ui-spinner--accent]="accent()"
      role="status"
      aria-label="Loading"
    ></span>
  `,
  styles: [
    `
      .ui-spinner {
        display: inline-block;
        width: var(--size, 22px);
        height: var(--size, 22px);
        border-radius: 50%;
        border: 2px solid var(--border-strong);
        border-top-color: var(--text-muted);
        animation: ezi-spin 0.7s linear infinite;
      }
      .ui-spinner--accent {
        border-color: var(--ezi-orange-soft);
        border-top-color: var(--accent);
      }
    `,
  ],
})
export class UiSpinner {
  readonly size = input(22);
  readonly accent = input(false);
}

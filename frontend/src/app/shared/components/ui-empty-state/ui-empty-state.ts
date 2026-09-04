import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Empty / no-result state. Keep it calm — no accent overload. */
@Component({
  selector: 'ui-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-empty">
      <div class="ui-empty__icon" aria-hidden="true">{{ icon() }}</div>
      <h3 class="ui-empty__title">{{ title() }}</h3>
      @if (message()) { <p class="ui-empty__msg">{{ message() }}</p> }
      <div class="ui-empty__action"><ng-content /></div>
    </div>
  `,
  styles: [
    `
      .ui-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: var(--sp-3);
        padding: var(--sp-8) var(--sp-4);
        max-width: 420px;
        margin-inline: auto;
      }
      .ui-empty__icon {
        font-size: 2.5rem;
        opacity: 0.6;
      }
      .ui-empty__title { font-size: var(--fs-xl); }
      .ui-empty__msg { color: var(--text-muted); font-size: var(--fs-sm); }
      .ui-empty__action:empty { display: none; }
      .ui-empty__action { margin-top: var(--sp-2); }
    `,
  ],
})
export class UiEmptyState {
  readonly icon = input('◍');
  readonly title = input('Nothing here yet');
  readonly message = input<string>('');
}

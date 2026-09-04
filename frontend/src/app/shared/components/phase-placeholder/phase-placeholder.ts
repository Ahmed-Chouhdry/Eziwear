import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Honest placeholder for pages whose full build lands in a later phase. */
@Component({
  selector: 'phase-placeholder',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container section pp">
      <span class="badge badge--muted">{{ phase() }}</span>
      <h1 class="pp__title">{{ title() }}</h1>
      <p class="pp__desc">{{ description() }}</p>
      <a class="btn btn--primary" routerLink="/shop">Continue shopping</a>
    </div>
  `,
  styles: [
    `
      .pp {
        min-height: 52vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: var(--sp-4);
      }
      .pp__title { font-size: var(--fs-3xl); text-transform: uppercase; }
      .pp__desc { color: var(--text-muted); max-width: 44ch; }
    `,
  ],
})
export class PhasePlaceholder {
  readonly phase = input('Coming soon');
  readonly title = input.required<string>();
  readonly description = input('This section is being built out in the next phase.');
}

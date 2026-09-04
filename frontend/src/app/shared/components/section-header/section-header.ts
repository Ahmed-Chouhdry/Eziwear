import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'section-header',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sh">
      <div class="sh__text">
        @if (eyebrow()) { <span class="eyebrow">{{ eyebrow() }}</span> }
        <h2 class="sh__title" [class.text-vip]="vip()">{{ title() }}</h2>
      </div>
      @if (linkTo()) {
        <a class="sh__link" [routerLink]="linkTo()">{{ linkLabel() }} <span aria-hidden="true">→</span></a>
      }
    </header>
  `,
  styles: [
    `
      .sh {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: var(--sp-4);
        margin-bottom: var(--sp-5);
        flex-wrap: wrap;
      }
      .sh__text { display: flex; flex-direction: column; gap: var(--sp-2); }
      .sh__title { font-size: var(--fs-2xl); text-transform: uppercase; }
      .sh__link {
        font-family: var(--font-display);
        font-size: var(--fs-xs);
        font-weight: 600;
        letter-spacing: var(--tracking-wide);
        text-transform: uppercase;
        color: var(--text-muted);
        white-space: nowrap;
      }
      .sh__link:hover { color: var(--accent); }
    `,
  ],
})
export class SectionHeader {
  readonly eyebrow = input<string>('');
  readonly title = input.required<string>();
  readonly linkTo = input<string | unknown[] | null>(null);
  readonly linkLabel = input('View all');
  readonly vip = input(false);
}

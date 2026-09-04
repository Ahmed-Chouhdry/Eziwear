import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Generic shimmer block. shape: text | title | img | pill | box */
@Component({
  selector: 'ui-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="skeleton"
    [class.skeleton--text]="shape() === 'text'"
    [class.skeleton--title]="shape() === 'title'"
    [class.skeleton--img]="shape() === 'img'"
    [class.skeleton--pill]="shape() === 'pill'"
    [style.width]="width()"
    [style.height]="height()"
  ></span>`,
  styles: [`:host { display: block; }`],
})
export class UiSkeleton {
  readonly shape = input<'text' | 'title' | 'img' | 'pill' | 'box'>('text');
  readonly width = input<string | null>(null);
  readonly height = input<string | null>(null);
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoaderService } from '../../../core/services/loader.service';

/** Global thin progress bar under the header, driven by LoaderService. */
@Component({
  selector: 'ui-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loader.isLoading()) {
      <div class="ui-loader" role="progressbar" aria-label="Loading">
        <div class="ui-loader__bar"></div>
      </div>
    }
  `,
  styles: [
    `
      .ui-loader {
        position: fixed;
        inset-block-start: 0;
        inset-inline: 0;
        height: 2px;
        z-index: var(--z-toast);
        background: var(--ezi-orange-soft);
        overflow: hidden;
      }
      .ui-loader__bar {
        height: 100%;
        width: 40%;
        background: var(--accent);
        animation: ezi-loader-slide 1.1s var(--ease-in-out) infinite;
      }
      @keyframes ezi-loader-slide {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(320%); }
      }
    `,
  ],
})
export class UiLoader {
  protected readonly loader = inject(LoaderService);
}

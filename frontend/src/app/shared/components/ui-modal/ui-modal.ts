import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';

/**
 * Accessible modal dialog. Locks body scroll, closes on backdrop click / Escape.
 * Usage:
 *   <ui-modal [open]="open()" title="Size guide" (closed)="open.set(false)">…</ui-modal>
 */
@Component({
  selector: 'ui-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="ui-modal" (click)="onBackdrop($event)">
        <div
          class="ui-modal__panel"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title() || 'Dialog'"
          (keydown.escape)="closed.emit()"
        >
          <header class="ui-modal__head">
            @if (title()) { <h2 class="ui-modal__title">{{ title() }}</h2> }
            <button class="ui-modal__close" (click)="closed.emit()" aria-label="Close">&times;</button>
          </header>
          <div class="ui-modal__body">
            <ng-content />
          </div>
          @if (hasFooter()) {
            <footer class="ui-modal__foot"><ng-content select="[modalFooter]" /></footer>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .ui-modal {
        position: fixed;
        inset: 0;
        z-index: var(--z-modal);
        display: grid;
        place-items: center;
        padding: var(--sp-4);
        background: var(--overlay);
        backdrop-filter: blur(3px);
        animation: ezi-fade-in var(--dur-fast) var(--ease-out);
      }
      .ui-modal__panel {
        width: min(560px, 100%);
        max-height: min(85dvh, 720px);
        display: flex;
        flex-direction: column;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        animation: ezi-scale-in var(--dur-base) var(--ease-out);
      }
      .ui-modal__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--sp-4);
        padding: var(--sp-4) var(--sp-5);
        border-bottom: 1px solid var(--border);
      }
      .ui-modal__title { font-size: var(--fs-xl); }
      .ui-modal__close { font-size: 24px; line-height: 1; color: var(--text-faint); padding: 4px; }
      .ui-modal__close:hover { color: var(--text); }
      .ui-modal__body { padding: var(--sp-5); overflow-y: auto; }
      .ui-modal__foot {
        padding: var(--sp-4) var(--sp-5);
        border-top: 1px solid var(--border);
        display: flex;
        justify-content: flex-end;
        gap: var(--sp-3);
      }
    `,
  ],
})
export class UiModal {
  private readonly doc = inject(DOCUMENT);

  readonly open = input(false);
  readonly title = input<string>('');
  readonly closeOnBackdrop = input(true);
  readonly hasFooter = input(false);

  readonly closed = output<void>();

  constructor() {
    effect(() => {
      this.doc.body.classList.toggle('is-locked', this.open());
    });
  }

  onBackdrop(event: MouseEvent): void {
    if (this.closeOnBackdrop() && event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'ui-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 1) {
      <nav class="ui-pg" aria-label="Pagination">
        <button
          class="ui-pg__btn"
          [disabled]="page() <= 1"
          (click)="go(page() - 1)"
          aria-label="Previous page"
        >
          ‹
        </button>

        @for (p of pages(); track p) {
          @if (p === -1) {
            <span class="ui-pg__gap" aria-hidden="true">…</span>
          } @else {
            <button
              class="ui-pg__btn"
              [class.is-active]="p === page()"
              [attr.aria-current]="p === page() ? 'page' : null"
              (click)="go(p)"
            >
              {{ p }}
            </button>
          }
        }

        <button
          class="ui-pg__btn"
          [disabled]="page() >= totalPages()"
          (click)="go(page() + 1)"
          aria-label="Next page"
        >
          ›
        </button>
      </nav>
    }
  `,
  styles: [
    `
      .ui-pg {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: var(--sp-2);
        padding-block: var(--sp-5);
      }
      .ui-pg__btn {
        min-width: 42px;
        height: 42px;
        padding: 0 var(--sp-2);
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-sm);
        color: var(--text);
        font-family: var(--font-display);
        font-size: var(--fs-sm);
        transition: all var(--dur-fast) var(--ease-out);
      }
      .ui-pg__btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
      .ui-pg__btn.is-active {
        background: var(--accent);
        border-color: var(--accent);
        color: var(--accent-contrast);
      }
      .ui-pg__btn:disabled { opacity: 0.35; pointer-events: none; }
      .ui-pg__gap { display: grid; place-items: center; min-width: 28px; color: var(--text-faint); }
    `,
  ],
})
export class UiPagination {
  readonly page = input(1);
  readonly totalPages = input(1);
  readonly pageChange = output<number>();

  protected readonly pages = computed<number[]>(() => {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const out: number[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    if (start > 2) out.push(-1);
    for (let i = start; i <= end; i++) out.push(i);
    if (end < total - 1) out.push(-1);
    out.push(total);
    return out;
  });

  go(p: number): void {
    if (p >= 1 && p <= this.totalPages() && p !== this.page()) {
      this.pageChange.emit(p);
    }
  }
}

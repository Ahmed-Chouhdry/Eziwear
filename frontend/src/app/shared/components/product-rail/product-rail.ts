import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Product } from '../../../core/models';
import { RevealDirective } from '../../directives/reveal.directive';
import { ProductCard } from '../product-card/product-card';
import { SectionHeader } from '../section-header/section-header';
import { UiSkeleton } from '../ui-skeleton/ui-skeleton';

/**
 * Horizontal product carousel — scroll-snap track + prev/next arrows.
 * (The Shop grid uses `.product-grid` directly; this is the home-page rail.)
 */
@Component({
  selector: 'product-rail',
  standalone: true,
  imports: [ProductCard, SectionHeader, UiSkeleton, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section container">
      <section-header
        [eyebrow]="eyebrow()"
        [title]="title()"
        [linkTo]="linkTo()"
        [vip]="vip()"
      />

      <div class="rail">
        <button class="rail__arrow rail__arrow--prev" type="button" aria-label="Previous" (click)="scrollBy(-1)">‹</button>

        <div class="rail__track" #track>
          @if (loading()) {
            @for (i of skeletons; track i) {
              <div class="rail__cell rail__sk">
                <ui-skeleton shape="img" />
                <ui-skeleton shape="text" width="80%" />
                <ui-skeleton shape="text" width="40%" />
              </div>
            }
          } @else if (products().length) {
            @for (p of products(); track p.id; let idx = $index) {
              <div class="rail__cell reveal" eziReveal [revealDelay]="idx * 40">
                <product-card [product]="p" (addToCart)="addToCart.emit($event)" />
              </div>
            }
          } @else {
            <p class="rail__empty text-muted">Nothing here right now — check back soon.</p>
          }
        </div>

        <button class="rail__arrow rail__arrow--next" type="button" aria-label="Next" (click)="scrollBy(1)">›</button>
      </div>
    </section>
  `,
  styles: [
    `
      .rail {
        position: relative;
        display: flex;
        align-items: center;
        gap: var(--sp-2);
      }
      .rail__track {
        display: flex;
        gap: var(--sp-3);
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scroll-behavior: smooth;
        scrollbar-width: none;
        padding-block: 4px;
        flex: 1;
        min-width: 0;
      }
      .rail__track::-webkit-scrollbar { display: none; }
      .rail__cell {
        scroll-snap-align: start;
        flex: 0 0 clamp(150px, 42vw, 200px);
      }
      @media (min-width: 769px) {
        .rail__cell { flex-basis: calc((100% - 4 * var(--sp-3)) / 5); }
      }
      .rail__sk { display: flex; flex-direction: column; gap: var(--sp-2); }
      .rail__empty { padding: var(--sp-6) 0; text-align: center; }

      .rail__arrow {
        flex: none;
        display: none;
        place-items: center;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 1px solid var(--border-strong);
        background: var(--surface);
        color: var(--text);
        font-size: 20px;
        line-height: 1;
        transition: border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
      }
      .rail__arrow:hover { border-color: var(--accent); color: var(--accent); }
      @media (min-width: 769px) {
        .rail__arrow { display: grid; }
      }
    `,
  ],
})
export class ProductRail {
  readonly eyebrow = input<string>('');
  readonly title = input.required<string>();
  readonly linkTo = input<string | unknown[] | null>(null);
  readonly vip = input(false);
  readonly products = input<Product[]>([]);
  readonly loading = input(false);

  readonly addToCart = output<Product>();

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');
  protected readonly skeletons = [0, 1, 2, 3, 4];

  protected scrollBy(dir: -1 | 1): void {
    const el = this.track()?.nativeElement;
    if (!el) return;
    const cell = el.querySelector<HTMLElement>('.rail__cell');
    const step = cell ? cell.offsetWidth + 12 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step * 2, behavior: 'smooth' });
  }
}

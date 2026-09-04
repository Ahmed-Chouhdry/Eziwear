import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Product } from '../../../core/models';
import { RevealDirective } from '../../directives/reveal.directive';
import { ProductCard } from '../product-card/product-card';
import { SectionHeader } from '../section-header/section-header';
import { UiSkeleton } from '../ui-skeleton/ui-skeleton';

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

      @if (loading()) {
        <div class="product-grid">
          @for (i of skeletons; track i) {
            <div class="rail__sk">
              <ui-skeleton shape="img" />
              <ui-skeleton shape="text" width="80%" />
              <ui-skeleton shape="text" width="40%" />
            </div>
          }
        </div>
      } @else if (products().length) {
        <div class="product-grid">
          @for (p of products(); track p.id; let idx = $index) {
            <div class="reveal" eziReveal [revealDelay]="idx * 60">
              <product-card [product]="p" (addToCart)="addToCart.emit($event)" />
            </div>
          }
        </div>
      } @else {
        <p class="rail__empty text-muted">Nothing here right now — check back soon.</p>
      }
    </section>
  `,
  styles: [
    `
      .rail__sk {
        display: flex;
        flex-direction: column;
        gap: var(--sp-2);
      }
      .rail__empty {
        padding: var(--sp-6) 0;
        text-align: center;
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

  protected readonly skeletons = [0, 1, 2, 3];
}

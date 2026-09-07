import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../../core/models';
import { WishlistService } from '../../../core/services/wishlist.service';
import { PricePipe } from '../../pipes/price.pipe';
import { UiBadge } from '../ui-badge/ui-badge';

@Component({
  selector: 'product-card',
  standalone: true,
  imports: [RouterLink, PricePipe, UiBadge, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard {
  protected readonly wishlist = inject(WishlistService);

  readonly product = input.required<Product>();
  readonly addToCart = output<Product>();

  protected readonly primaryImage = computed(
    () => this.product().images?.[0]?.imageUrl ?? '',
  );
  protected readonly hoverImage = computed(
    () => this.product().images?.[1]?.imageUrl ?? null,
  );
  protected readonly onSale = computed(() => {
    const p = this.product();
    return p.salePrice != null && p.salePrice < p.price;
  });
  protected readonly discountPct = computed(() => {
    const p = this.product();
    if (!this.onSale()) return 0;
    return Math.round(((p.price - (p.salePrice as number)) / p.price) * 100);
  });
  protected readonly inStock = computed(() =>
    this.product().variants?.some((v) => v.stock > 0) ?? true,
  );
  protected readonly link = computed(() => ['/product', this.product().slug]);

  protected readonly stars = computed(() => {
    const r = this.product().rating ?? 0;
    return [1, 2, 3, 4, 5].map((i) => (r >= i ? 'full' : r >= i - 0.5 ? 'half' : 'empty'));
  });
}

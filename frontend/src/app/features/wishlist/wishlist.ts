import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CartService } from '../../core/services/cart.service';
import { CatalogService } from '../../core/services/catalog.service';
import { ToastService } from '../../core/services/toast.service';
import { WishlistItem, WishlistService } from '../../core/services/wishlist.service';
import { UiEmptyState } from '../../shared/components/ui-empty-state/ui-empty-state';
import { PricePipe } from '../../shared/pipes/price.pipe';

type SortKey = 'newest' | 'price-asc' | 'price-desc';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [RouterLink, FormsModule, UiEmptyState, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class Wishlist {
  protected readonly wishlist = inject(WishlistService);
  private readonly catalog = inject(CatalogService);
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly sort = signal<SortKey>('newest');
  protected readonly busy = signal<number | null>(null);

  protected readonly items = computed<WishlistItem[]>(() => {
    const list = [...this.wishlist.items()];
    const price = (i: WishlistItem) => i.salePrice ?? i.price;
    switch (this.sort()) {
      case 'price-asc':
        return list.sort((a, b) => price(a) - price(b));
      case 'price-desc':
        return list.sort((a, b) => price(b) - price(a));
      default:
        return list.reverse(); // storage appends newest last
    }
  });

  protected onSale(i: WishlistItem): boolean {
    return i.salePrice != null && i.salePrice < i.price;
  }

  /** Resolve a stocked variant for the product and add it to the cart. */
  async addToCart(item: WishlistItem, buyNow = false): Promise<void> {
    this.busy.set(item.productId);
    try {
      const product = await firstValueFrom(this.catalog.getBySlug(item.slug));
      const variant = product?.variants?.find((v) => v.stock > 0);
      if (!product || !variant) {
        this.toast.error('This item is out of stock right now.');
        return;
      }
      await this.cart.add(
        {
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          slug: product.slug,
          image: product.images?.[0]?.imageUrl ?? null,
          size: variant.size,
          color: variant.color,
          unitPrice: product.salePrice ?? product.price,
          maxStock: variant.stock,
        },
        1,
      );
      this.toast.success(`${product.name} added to cart.`);
      if (buyNow) void this.router.navigate(['/checkout']);
    } catch {
      /* interceptor surfaced it */
    } finally {
      this.busy.set(null);
    }
  }
}

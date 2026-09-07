import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CartItem, Product } from '../../core/models';
import { CartService } from '../../core/services/cart.service';
import { CatalogService } from '../../core/services/catalog.service';
import { QuickAddService } from '../../core/services/quick-add.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { ProductRail } from '../../shared/components/product-rail/product-rail';
import { UiEmptyState } from '../../shared/components/ui-empty-state/ui-empty-state';
import { PricePipe } from '../../shared/pipes/price.pipe';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [RouterLink, FormsModule, UiEmptyState, PricePipe, ProductRail],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.scss',
})
export class CartPage {
  protected readonly cart = inject(CartService);
  private readonly wishlist = inject(WishlistService);
  private readonly catalog = inject(CatalogService);
  private readonly quickAdd = inject(QuickAddService);

  protected couponCode = '';
  protected readonly applying = signal(false);

  protected readonly count = computed(() =>
    this.cart.items().reduce((n, i) => n + i.quantity, 0),
  );

  private readonly bestSellers = toSignal(this.catalog.getBestSellers(4), { initialValue: null });
  protected readonly upsell = computed(() => this.bestSellers() ?? []);

  async applyCoupon(): Promise<void> {
    const code = this.couponCode.trim();
    if (!code) return;
    this.applying.set(true);
    const ok = await this.cart.applyCoupon(code);
    this.applying.set(false);
    if (ok) this.couponCode = '';
  }

  async moveToWishlist(item: CartItem): Promise<void> {
    await this.wishlist.add({
      id: item.productId,
      name: item.name,
      slug: item.slug,
      images: item.image ? [{ id: 0, imageUrl: item.image, sortOrder: 0 }] : [],
      price: item.unitPrice,
      salePrice: null,
    } as Product);
    await this.cart.remove(item.key);
  }

  onAdd(product: Product): void {
    this.quickAdd.add(product);
  }
}

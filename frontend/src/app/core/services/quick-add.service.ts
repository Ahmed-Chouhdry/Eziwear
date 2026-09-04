import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Product } from '../models';
import { CartService } from './cart.service';
import { ToastService } from './toast.service';
import { UiService } from './ui.service';

/** "Add to cart" straight from a product card. */
@Injectable({ providedIn: 'root' })
export class QuickAddService {
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);

  async add(product: Product): Promise<void> {
    const distinctSizes = new Set(product.variants.map((v) => v.size));
    const distinctColors = new Set(product.variants.map((v) => v.color));
    const needsChoice = distinctSizes.size > 1 || distinctColors.size > 1;

    const variant = product.variants.find((v) => v.stock > 0);
    if (!variant) {
      this.toast.error(`${product.name} is sold out.`);
      return;
    }

    // More than one option → send to the product page to choose.
    if (needsChoice) {
      void this.router.navigate(['/product', product.slug]);
      return;
    }

    await this.cart.add({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      slug: product.slug,
      image: product.images?.[0]?.imageUrl ?? null,
      size: variant.size,
      color: variant.color,
      unitPrice: product.salePrice ?? product.price,
      maxStock: variant.stock,
    });
    this.toast.success(`${product.name} added to cart.`);
    this.ui.toggleCartDrawer(true);
  }
}

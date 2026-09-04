import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { UiEmptyState } from '../../shared/components/ui-empty-state/ui-empty-state';
import { PricePipe } from '../../shared/pipes/price.pipe';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [RouterLink, FormsModule, UiEmptyState, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.scss',
})
export class CartPage {
  protected readonly cart = inject(CartService);

  protected couponCode = '';
  protected readonly applying = signal(false);

  async applyCoupon(): Promise<void> {
    const code = this.couponCode.trim();
    if (!code) return;
    this.applying.set(true);
    const ok = await this.cart.applyCoupon(code);
    this.applying.set(false);
    if (ok) this.couponCode = '';
  }
}

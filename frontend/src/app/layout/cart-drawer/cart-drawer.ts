import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { UiService } from '../../core/services/ui.service';
import { PricePipe } from '../../shared/pipes/price.pipe';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [RouterLink, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart-drawer.html',
  styleUrl: './cart-drawer.scss',
})
export class CartDrawer {
  protected readonly cart = inject(CartService);
  protected readonly ui = inject(UiService);

  close(): void {
    this.ui.toggleCartDrawer(false);
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WishlistService } from '../../core/services/wishlist.service';
import { UiEmptyState } from '../../shared/components/ui-empty-state/ui-empty-state';
import { PricePipe } from '../../shared/pipes/price.pipe';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [RouterLink, UiEmptyState, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class Wishlist {
  protected readonly wishlist = inject(WishlistService);
}

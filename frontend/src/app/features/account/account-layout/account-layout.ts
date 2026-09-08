import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { WishlistService } from '../../../core/services/wishlist.service';

@Component({
  selector: 'app-account-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-layout.html',
  styleUrl: './account-layout.scss',
})
export class AccountLayout {
  protected readonly auth = inject(AuthService);
  protected readonly wishlist = inject(WishlistService);

  protected readonly links = [
    { label: 'Dashboard', path: '/account/dashboard', icon: '▤' },
    { label: 'Orders', path: '/account/orders', icon: '▧' },
    { label: 'Returns', path: '/account/returns', icon: '⟲' },
    { label: 'Wishlist', path: '/wishlist', icon: '♡' },
    { label: 'Addresses', path: '/account/addresses', icon: '⌂' },
    { label: 'Profile', path: '/account/profile', icon: '◍' },
  ];

  logout(): void {
    this.auth.logout('/');
  }
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly navOpen = signal(false);

  protected readonly links = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: '▣' },
    { label: 'Products', path: '/admin/products', icon: '▤' },
    { label: 'Categories', path: '/admin/categories', icon: '▦' },
    { label: 'Orders', path: '/admin/orders', icon: '▧' },
    { label: 'Customers', path: '/admin/customers', icon: '◍' },
    { label: 'Sliders & Ads', path: '/admin/sliders', icon: '▭' },
    { label: 'Coupons', path: '/admin/coupons', icon: '⬡' },
    { label: 'Reviews', path: '/admin/reviews', icon: '★' },
  ];
}

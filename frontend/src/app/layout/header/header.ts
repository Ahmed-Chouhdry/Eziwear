import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CATEGORIES } from '../../core/nav';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { ThemeService } from '../../core/services/theme.service';
import { UiService } from '../../core/services/ui.service';
import { WishlistService } from '../../core/services/wishlist.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  protected readonly theme = inject(ThemeService);
  protected readonly cart = inject(CartService);
  protected readonly ui = inject(UiService);
  protected readonly auth = inject(AuthService);
  protected readonly wishlist = inject(WishlistService);
  private readonly router = inject(Router);
  protected readonly categories = CATEGORIES;

  protected readonly scrolled = signal(false);
  protected readonly searchTerm = signal('');

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 12);
  }

  protected submitSearch(event: Event): void {
    event.preventDefault();
    const q = this.searchTerm().trim();
    this.router.navigate(['/shop'], { queryParams: q ? { search: q } : {} });
  }
}

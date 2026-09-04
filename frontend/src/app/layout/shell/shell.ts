import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CartDrawer } from '../cart-drawer/cart-drawer';
import { Footer } from '../footer/footer';
import { Header } from '../header/header';
import { MobileMenu } from '../mobile-menu/mobile-menu';
import { SearchOverlay } from '../search-overlay/search-overlay';

/** Storefront shell: header + footer + global drawers around the routed page. */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, Header, Footer, MobileMenu, CartDrawer, SearchOverlay],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-header />
    <main id="main" class="shell__main">
      <router-outlet />
    </main>
    <app-footer />
    <app-mobile-menu />
    <app-cart-drawer />
    <app-search-overlay />
  `,
  styles: [
    `
      :host { display: flex; flex-direction: column; min-height: 100dvh; }
      .shell__main { flex: 1; }
    `,
  ],
})
export class Shell {}

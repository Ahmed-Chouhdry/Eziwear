import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

/** Cross-cutting UI state: drawers / menus that live outside a single route. */
@Injectable({ providedIn: 'root' })
export class UiService {
  private readonly doc = inject(DOCUMENT);

  readonly mobileMenuOpen = signal(false);
  readonly cartDrawerOpen = signal(false);
  readonly searchOpen = signal(false);

  readonly anyOverlayOpen = computed(
    () => this.mobileMenuOpen() || this.cartDrawerOpen() || this.searchOpen(),
  );

  constructor() {
    effect(() => {
      this.doc.body.classList.toggle('is-locked', this.anyOverlayOpen());
    });
  }

  toggleMobileMenu(force?: boolean) {
    this.mobileMenuOpen.set(force ?? !this.mobileMenuOpen());
    if (this.mobileMenuOpen()) {
      this.cartDrawerOpen.set(false);
      this.searchOpen.set(false);
    }
  }
  toggleCartDrawer(force?: boolean) {
    this.cartDrawerOpen.set(force ?? !this.cartDrawerOpen());
    if (this.cartDrawerOpen()) {
      this.mobileMenuOpen.set(false);
      this.searchOpen.set(false);
    }
  }
  toggleSearch(force?: boolean) {
    this.searchOpen.set(force ?? !this.searchOpen());
    if (this.searchOpen()) {
      this.mobileMenuOpen.set(false);
      this.cartDrawerOpen.set(false);
    }
  }
  closeAll() {
    this.mobileMenuOpen.set(false);
    this.cartDrawerOpen.set(false);
    this.searchOpen.set(false);
  }
}

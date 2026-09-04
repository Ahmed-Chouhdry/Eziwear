import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Product } from '../models';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';

export interface WishlistItem {
  productId: number;
  name: string;
  slug: string;
  image?: string | null;
  price: number;
  salePrice: number | null;
  inStock?: boolean;
}

const KEY = 'ezi-wishlist';

/**
 * Hybrid wishlist — guest items live in localStorage; for logged-in users the
 * server (`/api/v1/wishlist`) is the source of truth and guest items merge on login.
 */
@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);

  private readonly _items = signal<WishlistItem[]>(this.storage.get<WishlistItem[]>(KEY, []));
  private lastAuthState: boolean | null = null;

  readonly items = this._items.asReadonly();
  readonly count = computed(() => this._items().length);

  constructor() {
    effect(() => {
      if (!untracked(() => this.auth.isAuthenticated())) {
        this.storage.set(KEY, this._items());
      }
    });

    effect(() => {
      const authed = this.auth.isAuthenticated();
      if (this.lastAuthState === authed) return;
      const previous = this.lastAuthState;
      this.lastAuthState = authed;
      if (authed) void this.onLogin();
      else if (previous !== null) this._items.set([]);
    });
  }

  has(productId: number): boolean {
    return this._items().some((i) => i.productId === productId);
  }

  async toggle(product: Product): Promise<void> {
    if (this.has(product.id)) {
      await this.remove(product.id);
      this.toast.info(`${product.name} removed from wishlist.`);
    } else {
      await this.add(product);
      this.toast.success(`${product.name} saved to wishlist.`);
    }
  }

  async add(product: Product): Promise<void> {
    if (this.auth.isAuthenticated()) {
      const list = await firstValueFrom(
        this.api.post<WishlistItem[]>('wishlist', { productId: product.id }),
      );
      this._items.set(list);
      return;
    }
    if (this.has(product.id)) return;
    this._items.update((list) => [
      ...list,
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image: product.images?.[0]?.imageUrl ?? null,
        price: product.price,
        salePrice: product.salePrice ?? null,
      },
    ]);
  }

  async remove(productId: number): Promise<void> {
    if (this.auth.isAuthenticated()) {
      await firstValueFrom(this.api.delete<void>(`wishlist/${productId}`));
      this._items.update((list) => list.filter((i) => i.productId !== productId));
      return;
    }
    this._items.update((list) => list.filter((i) => i.productId !== productId));
  }

  async clear(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      this._items.set([]);
      return;
    }
    const ids = this._items().map((i) => i.productId);
    await Promise.all(ids.map((id) => firstValueFrom(this.api.delete<void>(`wishlist/${id}`))));
    this._items.set([]);
  }

  private async onLogin(): Promise<void> {
    const guestIds = untracked(() => this._items()).map((i) => i.productId);
    try {
      const list = guestIds.length
        ? await firstValueFrom(this.api.post<WishlistItem[]>('wishlist/merge', { productIds: guestIds }))
        : await firstValueFrom(this.api.get<WishlistItem[]>('wishlist'));
      this._items.set(list);
      this.storage.remove(KEY);
    } catch {
      /* interceptor surfaced it */
    }
  }
}

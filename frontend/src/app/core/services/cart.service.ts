import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppliedCoupon, CartDto, CartItem, CartTotals } from '../models';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';

type NewItem = Omit<CartItem, 'key' | 'serverId' | 'quantity'>;

const FREE_SHIPPING = 5000;
const FLAT_SHIPPING = 250;

/**
 * Hybrid cart.
 *  - Guest: state lives in localStorage.
 *  - Logged-in: state is the server cart (/api/v1/cart). On login the guest cart
 *    is merged into the server cart, then local storage is cleared.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);

  private readonly cartKey = environment.storageKeys.guestCart;
  private readonly couponKey = 'ezi-coupon';

  private readonly _items = signal<CartItem[]>(this.storage.get<CartItem[]>(this.cartKey, []));
  private readonly _coupon = signal<AppliedCoupon | null>(
    this.storage.get<AppliedCoupon | null>(this.couponKey, null),
  );
  private readonly _syncing = signal(false);
  private readonly _ready = signal(false);
  private lastAuthState: boolean | null = null;

  readonly items = this._items.asReadonly();
  readonly coupon = this._coupon.asReadonly();
  readonly syncing = this._syncing.asReadonly();
  /** false until the initial cart state has loaded (server fetch for logged-in users). */
  readonly ready = this._ready.asReadonly();

  readonly count = computed(() => this._items().reduce((n, i) => n + i.quantity, 0));
  readonly subtotal = computed(() =>
    this._items().reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
  );

  /**
   * Totals are always computed client-side (identical rules to the server); the
   * server recomputes authoritatively at checkout. Items come from the server
   * for logged-in users, so the subtotal is trustworthy.
   */
  readonly totals = computed<CartTotals>(() => {
    const subtotal = this.subtotal();
    const coupon = this._coupon();
    const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
    const net = subtotal - discount;
    const shippingFee = net > 0 && net < FREE_SHIPPING ? FLAT_SHIPPING : 0;
    return {
      subtotal: round2(subtotal),
      discount: round2(discount),
      shippingFee,
      total: round2(net + shippingFee),
    };
  });

  constructor() {
    // Persist guest state
    effect(() => {
      if (!untracked(() => this.auth.isAuthenticated())) {
        this.storage.set(this.cartKey, this._items());
      }
    });
    effect(() => this.storage.set(this.couponKey, this._coupon()));

    // Re-check an applied coupon whenever the cart contents change
    effect(() => {
      this._items();
      untracked(() => {
        if (this._coupon()) void this.revalidateCoupon();
      });
    });

    // React to login / logout. On first run with an already-authenticated user
    // (fresh construction right after login, or a reload with a valid token) we
    // still merge any guest items that were added while logged out.
    effect(() => {
      const authed = this.auth.isAuthenticated();
      const previous = this.lastAuthState;
      if (previous === authed) return;
      this.lastAuthState = authed;
      if (authed) {
        void this.onLogin().finally(() => this._ready.set(true));
      } else {
        if (previous !== null) this.onLogout();
        this._ready.set(true);
      }
    });
  }

  /** Resolves once the cart's initial state has loaded. */
  async whenReady(): Promise<void> {
    if (this._ready()) return;
    await new Promise<void>((resolve) => {
      const stop = setInterval(() => {
        if (this._ready()) {
          clearInterval(stop);
          resolve();
        }
      }, 40);
    });
  }

  // ---------- mutations ----------

  async add(item: NewItem, quantity = 1): Promise<void> {
    if (this.auth.isAuthenticated()) {
      await this.sync(this.api.post<CartDto>('cart/items', { variantId: item.variantId, quantity }));
      return;
    }
    const key = `${item.productId}:${item.variantId}`;
    this._items.update((list) => {
      const existing = list.find((i) => i.key === key);
      if (existing) {
        return list.map((i) =>
          i.key === key ? { ...i, quantity: clamp(i.quantity + quantity, 1, i.maxStock) } : i,
        );
      }
      return [...list, { ...item, key, serverId: null, quantity: clamp(quantity, 1, item.maxStock) }];
    });
  }

  async setQuantity(key: string, quantity: number): Promise<void> {
    const item = this._items().find((i) => i.key === key);
    if (!item) return;

    if (this.auth.isAuthenticated() && item.serverId != null) {
      if (quantity <= 0) {
        await this.sync(this.api.delete<CartDto>(`cart/items/${item.serverId}`));
      } else {
        await this.sync(this.api.patch<CartDto>(`cart/items/${item.serverId}`, { quantity }));
      }
      return;
    }
    this._items.update((list) =>
      list
        .map((i) => (i.key === key ? { ...i, quantity: clamp(quantity, 0, i.maxStock) } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  async remove(key: string): Promise<void> {
    const item = this._items().find((i) => i.key === key);
    if (this.auth.isAuthenticated() && item?.serverId != null) {
      await this.sync(this.api.delete<CartDto>(`cart/items/${item.serverId}`));
      return;
    }
    this._items.update((list) => list.filter((i) => i.key !== key));
  }

  async clear(): Promise<void> {
    if (this.auth.isAuthenticated()) {
      await this.sync(this.api.delete<CartDto>('cart'));
    } else {
      this._items.set([]);
    }
    this._coupon.set(null);
  }

  // ---------- coupon ----------

  async applyCoupon(code: string): Promise<boolean> {
    const items = this._items().map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
    if (items.length === 0) {
      this.toast.error('Add something to your cart first.');
      return false;
    }
    try {
      const coupon = await firstValueFrom(
        this.api.post<AppliedCoupon>('cart/coupon/validate', { code, items }),
      );
      this._coupon.set(coupon);
      this.toast.success(`Coupon ${coupon.code} applied.`);
      return true;
    } catch {
      return false;
    }
  }

  removeCoupon(): void {
    this._coupon.set(null);
  }

  // ---------- validation (before checkout) ----------

  /** The server already emptied the cart while creating an order — mirror that locally. */
  clearAfterOrder(): void {
    this._items.set([]);
    this._coupon.set(null);
    this.storage.remove(this.cartKey);
  }

  async revalidate(): Promise<{ changed: boolean }> {
    const items = this._items().map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
    if (items.length === 0) return { changed: false };
    try {
      const dto = await firstValueFrom(this.api.post<CartDto>('cart/validate', { items }));
      this.applyDto(dto);
      if (dto.changed) {
        this.toast.info('Your cart was updated to match available stock.');
      }
      return { changed: dto.changed };
    } catch {
      return { changed: false };
    }
  }

  // ---------- server sync ----------

  private async onLogin(): Promise<void> {
    const guestItems = this._items()
      .filter((i) => i.serverId == null)
      .map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
    try {
      this._syncing.set(true);
      if (guestItems.length) {
        await firstValueFrom(this.api.post<CartDto>('cart/merge', { items: guestItems }));
      }
      await this.loadServerCart();
      this.storage.remove(this.cartKey);
    } finally {
      this._syncing.set(false);
    }
  }

  private onLogout(): void {
    this._items.set([]);
    this._coupon.set(null);
  }

  private async loadServerCart(): Promise<void> {
    try {
      const dto = await firstValueFrom(this.api.get<CartDto>('cart'));
      this.applyDto(dto);
    } catch {
      /* interceptor already surfaced it */
    }
  }

  private async sync(request: Observable<CartDto>): Promise<void> {
    try {
      this._syncing.set(true);
      this.applyDto(await firstValueFrom(request));
    } finally {
      this._syncing.set(false);
    }
  }

  private applyDto(dto: CartDto): void {
    this._items.set(
      dto.items.map((i) => ({
        key: `${i.productId}:${i.variantId}`,
        serverId: i.id,
        productId: i.productId,
        variantId: i.variantId,
        name: i.name,
        slug: i.slug,
        image: i.image,
        size: i.size,
        color: i.color,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        maxStock: i.maxStock,
      })),
    );
  }

  /** Re-checks an applied coupon against the current cart; drops it if no longer valid. */
  private async revalidateCoupon(): Promise<void> {
    const coupon = this._coupon();
    if (!coupon) return;
    const items = this._items().map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
    // An empty cart may just be mid-load — keep the coupon; it is re-checked at checkout.
    if (items.length === 0) return;
    try {
      const fresh = await firstValueFrom(
        this.api.post<AppliedCoupon>('cart/coupon/validate', { code: coupon.code, items }),
      );
      this._coupon.set(fresh);
    } catch {
      this._coupon.set(null);
      this.toast.info(`Coupon ${coupon.code} was removed — it no longer applies to your cart.`);
    }
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(n, Math.max(min, max)));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

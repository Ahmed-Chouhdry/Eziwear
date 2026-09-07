import { Injectable, computed, inject, signal, untracked } from '@angular/core';
import { Product } from '../models';
import { StorageService } from './storage.service';

const KEY = 'ezi-recent';
const MAX = 8;

/**
 * Per-device "recently viewed" products — a small ring of Product snapshots in
 * localStorage, newest first. Presentational only; mirrors WishlistService's shape.
 */
@Injectable({ providedIn: 'root' })
export class RecentlyViewedService {
  private readonly storage = inject(StorageService);
  private readonly _items = signal<Product[]>(this.storage.get<Product[]>(KEY, []));

  readonly items = this._items.asReadonly();

  /** Products other than `excludeId`, for a "you recently viewed" rail. */
  readonly except = (excludeId: number) =>
    computed(() => this._items().filter((p) => p.id !== excludeId));

  record(product: Product): void {
    // Read untracked so callers inside an effect don't take a dependency on the
    // signal this method writes (which would loop the effect).
    const current = untracked(this._items);
    if (current[0]?.id === product.id) return;
    const next = [product, ...current.filter((p) => p.id !== product.id)].slice(0, MAX);
    this._items.set(next);
    this.storage.set(KEY, next);
  }
}

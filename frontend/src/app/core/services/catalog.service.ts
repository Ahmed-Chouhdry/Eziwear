import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { Category, Paginated, Product, ProductQuery } from '../models';
import { ApiService } from './api.service';

export interface CatalogFilterOptions {
  sizes: string[];
  colors: { name: string; hex: string | null }[];
  priceRange: { min: number; max: number };
}

/** Storefront catalog — backed by /api/v1 (Phase 5+). */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly api = inject(ApiService);

  getCategories(): Observable<Category[]> {
    return this.api.get<Category[]>('categories');
  }

  getFilterOptions(category?: string): Observable<CatalogFilterOptions> {
    return this.api
      .get<CatalogFilterOptions>('products/filters', { category })
      .pipe(
        catchError(() =>
          of<CatalogFilterOptions>({ sizes: [], colors: [], priceRange: { min: 0, max: 0 } }),
        ),
      );
  }

  private section(name: string, limit: number): Observable<Product[]> {
    return this.api.get<Product[]>(`products/sections/${name}`, { limit });
  }

  getNewArrivals(limit = 8): Observable<Product[]> {
    return this.section('new-arrivals', limit);
  }
  getFeatured(limit = 8): Observable<Product[]> {
    return this.section('featured', limit);
  }
  getVip(limit = 8): Observable<Product[]> {
    return this.section('vip', limit);
  }
  getBestSellers(limit = 8): Observable<Product[]> {
    return this.section('best-sellers', limit);
  }

  getBySlug(slug: string): Observable<Product | undefined> {
    return this.api.get<Product>(`products/${encodeURIComponent(slug)}`).pipe(
      catchError(() => of(undefined)),
    );
  }

  getRelated(product: Product, limit = 4): Observable<Product[]> {
    return this.api
      .get<Product[]>(`products/${encodeURIComponent(product.slug)}/related`, { limit })
      .pipe(catchError(() => of([])));
  }

  query(q: ProductQuery): Observable<Paginated<Product>> {
    return this.api.get<Paginated<Product>>('products', {
      category: q.category,
      search: q.search,
      minPrice: q.minPrice,
      maxPrice: q.maxPrice,
      sizes: q.sizes,
      colors: q.colors,
      inStock: q.inStock,
      sort: q.sort,
      page: q.page,
      pageSize: q.pageSize,
    });
  }
}

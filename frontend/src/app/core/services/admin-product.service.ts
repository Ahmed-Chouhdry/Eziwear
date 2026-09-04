import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AdminCategory,
  AdminProduct,
  AdminProductListItem,
  AdminProductListQuery,
  CreateProductPayload,
  ImageInput,
  Paginated,
  UpdateProductPayload,
  VariantInput,
} from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AdminProductService {
  private readonly api = inject(ApiService);

  categories(): Observable<AdminCategory[]> {
    return this.api.get<AdminCategory[]>('admin/categories');
  }

  list(query: AdminProductListQuery): Observable<Paginated<AdminProductListItem>> {
    return this.api.get<Paginated<AdminProductListItem>>('admin/products', {
      search: query.search,
      status: query.status,
      category: query.category,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  get(id: number): Observable<AdminProduct> {
    return this.api.get<AdminProduct>(`admin/products/${id}`);
  }

  create(payload: CreateProductPayload): Observable<AdminProduct> {
    return this.api.post<AdminProduct>('admin/products', payload);
  }

  update(id: number, payload: UpdateProductPayload): Observable<AdminProduct> {
    return this.api.patch<AdminProduct>(`admin/products/${id}`, payload);
  }

  replaceImages(id: number, images: ImageInput[]): Observable<AdminProduct> {
    return this.api.put<AdminProduct>(`admin/products/${id}/images`, { images });
  }

  addVariant(productId: number, variant: VariantInput): Observable<AdminProduct> {
    return this.api.post<AdminProduct>(`admin/products/${productId}/variants`, variant);
  }

  updateVariant(variantId: number, patch: Partial<VariantInput>): Observable<AdminProduct> {
    return this.api.patch<AdminProduct>(`admin/variants/${variantId}`, patch);
  }

  deleteVariant(variantId: number): Observable<{ deleted: boolean }> {
    return this.api.delete<{ deleted: boolean }>(`admin/variants/${variantId}`);
  }

  archive(id: number): Observable<{ archived: true }> {
    return this.api.delete<{ archived: true }>(`admin/products/${id}`);
  }

  hardDelete(id: number): Observable<{ archived: boolean }> {
    return this.api.delete<{ archived: boolean }>(`admin/products/${id}?hard=true`);
  }
}

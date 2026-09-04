import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface AdminCategoryDto {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  sortOrder: number;
  status: 'active' | 'inactive';
  productCount: number;
}

export interface CategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  status: 'active' | 'inactive';
}

@Injectable({ providedIn: 'root' })
export class AdminCategoryService {
  private readonly api = inject(ApiService);

  list(): Observable<AdminCategoryDto[]> {
    return this.api.get<AdminCategoryDto[]>('admin/categories');
  }

  create(payload: CategoryPayload): Observable<AdminCategoryDto> {
    return this.api.post<AdminCategoryDto>('admin/categories', payload);
  }

  update(id: number, payload: Partial<CategoryPayload>): Observable<AdminCategoryDto> {
    return this.api.patch<AdminCategoryDto>(`admin/categories/${id}`, payload);
  }

  move(id: number, direction: 'up' | 'down'): Observable<AdminCategoryDto[]> {
    return this.api.post<AdminCategoryDto[]>(`admin/categories/${id}/move`, { direction });
  }

  remove(id: number): Observable<void> {
    return this.api.delete<void>(`admin/categories/${id}`);
  }
}

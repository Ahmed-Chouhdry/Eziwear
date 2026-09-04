import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Paginated } from '../models';
import { ApiService } from './api.service';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface AdminReviewListItem {
  id: number;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  customerName: string;
  productName: string;
  productSlug: string;
  createdAt: string;
}

export interface AdminReviewListQuery {
  status?: ReviewStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminReviewService {
  private readonly api = inject(ApiService);

  list(query: AdminReviewListQuery): Observable<Paginated<AdminReviewListItem>> {
    return this.api.get<Paginated<AdminReviewListItem>>('admin/reviews', { ...query });
  }
  updateStatus(id: number, status: 'approved' | 'rejected'): Observable<{ updated: boolean }> {
    return this.api.patch<{ updated: boolean }>(`admin/reviews/${id}/status`, { status });
  }
  remove(id: number): Observable<void> {
    return this.api.delete<void>(`admin/reviews/${id}`);
  }
}

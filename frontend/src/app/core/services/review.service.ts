import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Paginated } from '../models';
import { ApiService } from './api.service';

export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewerName: string;
  createdAt: string;
}

export interface ReviewEligibility {
  eligible: boolean;
  review: Review | null;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly api = inject(ApiService);

  list(slug: string, page = 1, pageSize = 10): Observable<Paginated<Review>> {
    return this.api.get<Paginated<Review>>(`products/${encodeURIComponent(slug)}/reviews`, {
      page,
      pageSize,
    });
  }

  mine(slug: string): Observable<ReviewEligibility> {
    return this.api.get<ReviewEligibility>(`products/${encodeURIComponent(slug)}/reviews/mine`);
  }

  submit(slug: string, rating: number, comment?: string): Observable<Review> {
    return this.api.post<Review>(`products/${encodeURIComponent(slug)}/reviews`, { rating, comment });
  }
}

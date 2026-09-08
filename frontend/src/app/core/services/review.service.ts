import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Paginated } from '../models';
import { ApiService } from './api.service';

export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  images: string[];
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
  private readonly http = inject(HttpClient);

  list(slug: string, page = 1, pageSize = 10): Observable<Paginated<Review>> {
    return this.api.get<Paginated<Review>>(`products/${encodeURIComponent(slug)}/reviews`, {
      page,
      pageSize,
    });
  }

  mine(slug: string): Observable<ReviewEligibility> {
    return this.api.get<ReviewEligibility>(`products/${encodeURIComponent(slug)}/reviews/mine`);
  }

  submit(slug: string, rating: number, comment?: string, images?: string[]): Observable<Review> {
    return this.api.post<Review>(`products/${encodeURIComponent(slug)}/reviews`, {
      rating,
      comment,
      images,
    });
  }

  /** Upload one review photo → returns its hosted URL. Bypasses ApiService so
      FormData isn't JSON-serialised (auth interceptor still attaches the token). */
  uploadPhoto(file: File): Observable<string> {
    const form = new FormData();
    form.append('file', file);
    return this.http
      .post<{ success: boolean; data: { url: string } }>(
        `${environment.apiBaseUrl}/reviews/upload`,
        form,
      )
      .pipe(map((r) => r.data.url));
  }
}

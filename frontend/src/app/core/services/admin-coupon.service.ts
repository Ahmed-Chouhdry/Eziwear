import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Paginated } from '../models';
import { ApiService } from './api.service';

export type CouponType = 'percentage' | 'fixed';

export interface AdminCoupon {
  id: number;
  code: string;
  type: CouponType;
  value: number;
  minOrder: number | null;
  maxDiscount: number | null;
  startAt: string | null;
  endAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface AdminCouponListQuery {
  search?: string;
  status?: 'active' | 'inactive';
  page?: number;
  pageSize?: number;
}

export interface CouponPayload {
  code: string;
  type: CouponType;
  value: number;
  minOrder?: number;
  maxDiscount?: number;
  startAt?: string;
  endAt?: string;
  usageLimit?: number;
  status: 'active' | 'inactive';
}

@Injectable({ providedIn: 'root' })
export class AdminCouponService {
  private readonly api = inject(ApiService);

  list(query: AdminCouponListQuery): Observable<Paginated<AdminCoupon>> {
    return this.api.get<Paginated<AdminCoupon>>('admin/coupons', { ...query });
  }
  create(payload: CouponPayload): Observable<AdminCoupon> {
    return this.api.post<AdminCoupon>('admin/coupons', payload);
  }
  update(id: number, payload: Partial<CouponPayload>): Observable<AdminCoupon> {
    return this.api.patch<AdminCoupon>(`admin/coupons/${id}`, payload);
  }
  remove(id: number): Observable<void> {
    return this.api.delete<void>(`admin/coupons/${id}`);
  }
}

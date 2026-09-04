import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface AdminStats {
  revenue: number;
  revenueDelivered: number;
  orders: {
    total: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  customers: number;
  products: number;
  vipProducts: number;
  lowStock: number;
  outOfStock: number;
  pendingReviews: number;
}

export interface SalesPoint {
  date: string;
  total: number;
  orders: number;
}

export interface AdminRecentOrder {
  orderNumber: string;
  customer: string;
  total: number;
  itemCount: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
}

export interface LowStockVariant {
  productId: number;
  productName: string;
  slug: string;
  size: string;
  color: string;
  stock: number;
  sku: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  stats(): Observable<AdminStats> {
    return this.api.get<AdminStats>('admin/stats');
  }

  sales(days = 14): Observable<SalesPoint[]> {
    return this.api.get<SalesPoint[]>('admin/stats/sales', { days });
  }

  recentOrders(limit = 8): Observable<AdminRecentOrder[]> {
    return this.api.get<AdminRecentOrder[]>('admin/orders/recent', { limit });
  }

  lowStock(limit = 20): Observable<LowStockVariant[]> {
    return this.api.get<LowStockVariant[]>('admin/inventory/low-stock', { limit });
  }
}

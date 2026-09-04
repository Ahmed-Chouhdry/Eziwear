import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Order, OrderStatus, Paginated, PaymentStatus } from '../models';
import { ApiService } from './api.service';

export interface AdminOrderListItem {
  orderNumber: string;
  customer: string;
  customerEmail: string;
  total: number;
  itemCount: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  createdAt: string;
}

export interface AdminOrderListQuery {
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminOrderService {
  private readonly api = inject(ApiService);

  list(query: AdminOrderListQuery): Observable<Paginated<AdminOrderListItem>> {
    return this.api.get<Paginated<AdminOrderListItem>>('admin/orders', { ...query });
  }

  get(orderNumber: string): Observable<Order> {
    return this.api.get<Order>(`admin/orders/${encodeURIComponent(orderNumber)}`);
  }

  updateStatus(orderNumber: string, status: OrderStatus, note?: string): Observable<Order> {
    return this.api.patch<Order>(`admin/orders/${encodeURIComponent(orderNumber)}/status`, {
      status,
      note,
    });
  }

  updatePaymentStatus(orderNumber: string, paymentStatus: PaymentStatus): Observable<Order> {
    return this.api.patch<Order>(`admin/orders/${encodeURIComponent(orderNumber)}/payment-status`, {
      paymentStatus,
    });
  }
}

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateOrderPayload, Order, OrderSummary } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly api = inject(ApiService);

  list(): Observable<OrderSummary[]> {
    return this.api.get<OrderSummary[]>('orders');
  }

  get(orderNumber: string): Observable<Order> {
    return this.api.get<Order>(`orders/${encodeURIComponent(orderNumber)}`);
  }

  create(payload: CreateOrderPayload): Observable<Order> {
    return this.api.post<Order>('orders', payload);
  }
}

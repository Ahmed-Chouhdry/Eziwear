import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateGuestOrderPayload, CreateOrderPayload, GuestOrder, Order, OrderSummary } from '../models';
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

  getGuest(orderNumber: string, token: string): Observable<Order> {
    return this.api.get<Order>(`orders/guest/${encodeURIComponent(orderNumber)}`, { token });
  }

  createGuest(payload: CreateGuestOrderPayload): Observable<GuestOrder> {
    return this.api.post<GuestOrder>('orders/guest', payload);
  }

  create(payload: CreateOrderPayload): Observable<Order> {
    return this.api.post<Order>('orders', payload);
  }
}

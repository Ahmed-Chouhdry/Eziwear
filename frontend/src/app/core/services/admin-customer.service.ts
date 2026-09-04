import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Paginated } from '../models';
import { ApiService } from './api.service';

export interface AdminCustomerListItem {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'suspended';
  orderCount: number;
  totalSpent: number;
  createdAt: string;
}

export interface AdminCustomerDetail extends AdminCustomerListItem {
  addresses: { id: number; name: string; city: string; isDefault: boolean }[];
  orders: {
    orderNumber: string;
    total: number;
    orderStatus: string;
    paymentStatus: string;
    createdAt: string;
  }[];
}

export interface AdminCustomerListQuery {
  search?: string;
  status?: 'active' | 'suspended';
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminCustomerService {
  private readonly api = inject(ApiService);

  list(query: AdminCustomerListQuery): Observable<Paginated<AdminCustomerListItem>> {
    return this.api.get<Paginated<AdminCustomerListItem>>('admin/customers', { ...query });
  }

  get(id: number): Observable<AdminCustomerDetail> {
    return this.api.get<AdminCustomerDetail>(`admin/customers/${id}`);
  }

  updateStatus(id: number, status: 'active' | 'suspended'): Observable<{ updated: boolean }> {
    return this.api.patch<{ updated: boolean }>(`admin/customers/${id}/status`, { status });
  }
}

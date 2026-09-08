import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Paginated } from '../models';
import { ApiService } from './api.service';

export type ReturnStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'awaiting_pickup'
  | 'received'
  | 'inspected'
  | 'refunded'
  | 'exchanged'
  | 'closed'
  | 'cancelled';

export const RETURN_REASONS: { value: string; label: string }[] = [
  { value: 'wrong_size', label: 'Wrong size' },
  { value: 'wrong_item', label: 'Wrong item received' },
  { value: 'defective', label: 'Defective / faulty' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'damaged_in_transit', label: 'Damaged in transit' },
  { value: 'other', label: 'Other' },
];

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: 'Requested',
  approved: 'Approved',
  rejected: 'Rejected',
  awaiting_pickup: 'Awaiting pickup',
  received: 'Received',
  inspected: 'Inspected',
  refunded: 'Refunded',
  exchanged: 'Exchanged',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export interface EligibleItem {
  orderItemId: number;
  productName: string;
  size: string;
  color: string;
  unitPrice: number;
  orderedQuantity: number;
  returnableQuantity: number;
}
export interface ReturnEligibility {
  eligible: boolean;
  reason: string | null;
  orderNumber: string;
  deliveredAt: string | null;
  returnWindowEndsAt: string | null;
  returnWindowDays: number;
  items: EligibleItem[];
}

export interface ReturnItem {
  id: number;
  orderItemId: number;
  productName: string;
  size: string;
  color: string;
  unitPrice: number;
  quantity: number;
  reason: string;
  comment: string | null;
  photoUrl: string | null;
  itemStatus: 'pending' | 'accepted' | 'rejected';
  conditionNotes: string | null;
}
export interface ReturnHistoryEntry {
  id: number;
  status: string;
  note: string | null;
  changed_by: number | null;
  changed_at: string;
}
export interface ReturnRequest {
  id: number;
  orderId: number;
  orderNumber: string;
  status: ReturnStatus;
  resolutionType: 'refund' | 'exchange';
  refundMethod: string | null;
  refundAmount: number | null;
  refundStatus: 'pending' | 'processing' | 'processed' | null;
  adminNotes: string | null;
  rejectionReason: string | null;
  requestedAt: string;
  updatedAt: string;
  customerName?: string;
  customerEmail?: string;
  items: ReturnItem[];
  history: ReturnHistoryEntry[];
}

export interface CreateReturnPayload {
  resolution_type: 'refund' | 'exchange';
  items: {
    order_item_id: number;
    quantity: number;
    reason: string;
    comment?: string;
    photo_url?: string;
  }[];
}

@Injectable({ providedIn: 'root' })
export class ReturnService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  // ---- customer ----
  eligibility(orderId: number): Observable<ReturnEligibility> {
    return this.api.get<ReturnEligibility>(`orders/${orderId}/return-eligibility`);
  }
  create(orderId: number, payload: CreateReturnPayload): Observable<ReturnRequest> {
    return this.api.post<ReturnRequest>(`orders/${orderId}/returns`, payload);
  }
  listMine(page = 1): Observable<Paginated<ReturnRequest>> {
    return this.api.get<Paginated<ReturnRequest>>('returns', { page });
  }
  getMine(id: number): Observable<ReturnRequest> {
    return this.api.get<ReturnRequest>(`returns/${id}`);
  }
  cancel(id: number): Observable<ReturnRequest> {
    return this.api.post<ReturnRequest>(`returns/${id}/cancel`, {});
  }
  uploadPhoto(file: File): Observable<string> {
    const form = new FormData();
    form.append('file', file);
    return this.http
      .post<{ data: { url: string } }>(`${environment.apiBaseUrl}/reviews/upload`, form)
      .pipe(map((r) => r.data.url));
  }

  // ---- admin ----
  adminList(q: {
    page?: number;
    status?: string;
    search?: string;
  }): Observable<Paginated<ReturnRequest>> {
    return this.api.get<Paginated<ReturnRequest>>('admin/returns', { ...q });
  }
  adminGet(id: number): Observable<ReturnRequest> {
    return this.api.get<ReturnRequest>(`admin/returns/${id}`);
  }
  approve(id: number): Observable<ReturnRequest> {
    return this.api.patch<ReturnRequest>(`admin/returns/${id}/approve`, {});
  }
  reject(id: number, rejection_reason: string): Observable<ReturnRequest> {
    return this.api.patch<ReturnRequest>(`admin/returns/${id}/reject`, { rejection_reason });
  }
  logistics(id: number, status: string, note?: string): Observable<ReturnRequest> {
    return this.api.patch<ReturnRequest>(`admin/returns/${id}/logistics-status`, { status, note });
  }
  inspectItem(
    id: number,
    itemId: number,
    item_status: 'accepted' | 'rejected',
    condition_notes?: string,
  ): Observable<ReturnRequest> {
    return this.api.patch<ReturnRequest>(`admin/returns/${id}/items/${itemId}/inspect`, {
      item_status,
      condition_notes,
    });
  }
  refund(id: number, refund_method: string): Observable<ReturnRequest> {
    return this.api.patch<ReturnRequest>(`admin/returns/${id}/refund`, { refund_method });
  }
  setNotes(id: number, admin_notes: string): Observable<ReturnRequest> {
    return this.api.patch<ReturnRequest>(`admin/returns/${id}/notes`, { admin_notes });
  }
}

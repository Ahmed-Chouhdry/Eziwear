import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface OfferAudience {
  recipients: number;
  unsubscribed: number;
  emailConfigured: boolean;
}

export interface OfferPayload {
  subject: string;
  headline: string;
  message: string;
  couponCode?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  testOnly: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminOfferService {
  private readonly api = inject(ApiService);

  audience(): Observable<OfferAudience> {
    return this.api.get<OfferAudience>('admin/offers/audience');
  }

  send(payload: OfferPayload): Observable<{ queued: number; test: boolean }> {
    return this.api.post<{ queued: number; test: boolean }>('admin/offers/send', payload);
  }
}

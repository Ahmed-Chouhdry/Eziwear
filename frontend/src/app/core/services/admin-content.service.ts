import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface AdminSlider {
  id: number;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  imageUrlMobile: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  sortOrder: number;
  status: 'active' | 'inactive';
}

export interface SliderPayload {
  title?: string;
  subtitle?: string;
  imageUrl: string;
  imageUrlMobile?: string;
  buttonText?: string;
  buttonLink?: string;
  status: 'active' | 'inactive';
}

export type AdPosition = 'hero' | 'homepage_banner' | 'popup' | 'category';

export interface AdminAd {
  id: number;
  title: string | null;
  description: string | null;
  mediaUrl: string;
  ctaText: string | null;
  ctaLink: string | null;
  position: AdPosition;
  startAt: string | null;
  endAt: string | null;
  status: 'active' | 'inactive';
}

export interface AdPayload {
  title?: string;
  description?: string;
  mediaUrl: string;
  ctaText?: string;
  ctaLink?: string;
  position: AdPosition;
  startAt?: string;
  endAt?: string;
  status: 'active' | 'inactive';
}

export interface AdminSocialLink {
  id: number;
  platform: string;
  url: string;
  sortOrder: number;
  status: 'active' | 'inactive';
}

export interface SocialLinkPayload {
  platform: string;
  url: string;
  status: 'active' | 'inactive';
}

@Injectable({ providedIn: 'root' })
export class AdminContentService {
  private readonly api = inject(ApiService);

  // ---- sliders ----
  sliders(): Observable<AdminSlider[]> {
    return this.api.get<AdminSlider[]>('admin/sliders');
  }
  createSlider(payload: SliderPayload): Observable<AdminSlider> {
    return this.api.post<AdminSlider>('admin/sliders', payload);
  }
  updateSlider(id: number, payload: Partial<SliderPayload>): Observable<AdminSlider> {
    return this.api.patch<AdminSlider>(`admin/sliders/${id}`, payload);
  }
  moveSlider(id: number, direction: 'up' | 'down'): Observable<AdminSlider[]> {
    return this.api.post<AdminSlider[]>(`admin/sliders/${id}/move`, { direction });
  }
  removeSlider(id: number): Observable<void> {
    return this.api.delete<void>(`admin/sliders/${id}`);
  }

  // ---- advertisements ----
  ads(): Observable<AdminAd[]> {
    return this.api.get<AdminAd[]>('admin/advertisements');
  }
  createAd(payload: AdPayload): Observable<AdminAd> {
    return this.api.post<AdminAd>('admin/advertisements', payload);
  }
  updateAd(id: number, payload: Partial<AdPayload>): Observable<AdminAd> {
    return this.api.patch<AdminAd>(`admin/advertisements/${id}`, payload);
  }
  removeAd(id: number): Observable<void> {
    return this.api.delete<void>(`admin/advertisements/${id}`);
  }

  // ---- social links ----
  socialLinks(): Observable<AdminSocialLink[]> {
    return this.api.get<AdminSocialLink[]>('admin/social-links');
  }
  createSocialLink(payload: SocialLinkPayload): Observable<AdminSocialLink> {
    return this.api.post<AdminSocialLink>('admin/social-links', payload);
  }
  updateSocialLink(id: number, payload: Partial<SocialLinkPayload>): Observable<AdminSocialLink> {
    return this.api.patch<AdminSocialLink>(`admin/social-links/${id}`, payload);
  }
  moveSocialLink(id: number, direction: 'up' | 'down'): Observable<AdminSocialLink[]> {
    return this.api.post<AdminSocialLink[]>(`admin/social-links/${id}/move`, { direction });
  }
  removeSocialLink(id: number): Observable<void> {
    return this.api.delete<void>(`admin/social-links/${id}`);
  }
}

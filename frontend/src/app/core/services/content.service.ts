import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, shareReplay } from 'rxjs';
import { ApiService } from './api.service';

export interface Slider {
  id: number;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  imageUrlMobile: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  sortOrder: number;
}

export interface SocialLink {
  id: number;
  platform: string;
  url: string;
}

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly api = inject(ApiService);

  private sliders$?: Observable<Slider[]>;
  private social$?: Observable<SocialLink[]>;

  getSliders(): Observable<Slider[]> {
    this.sliders$ ??= this.api.get<Slider[]>('sliders').pipe(
      catchError(() => of([])),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.sliders$;
  }

  getSocialLinks(): Observable<SocialLink[]> {
    this.social$ ??= this.api.get<SocialLink[]>('social-links').pipe(
      catchError(() => of([])),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.social$;
  }
}

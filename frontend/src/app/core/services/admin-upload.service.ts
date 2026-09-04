import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models';

export type UploadFolder = 'products' | 'categories' | 'sliders' | 'ads';

export interface UploadResult {
  url: string;
  publicId: string;
}

@Injectable({ providedIn: 'root' })
export class AdminUploadService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** Multipart upload — bypasses ApiService since it JSON-encodes; FormData needs no Content-Type override. */
  upload(file: File, folder: UploadFolder): Observable<UploadResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http
      .post<ApiResponse<UploadResult>>(`${this.base}/admin/uploads?folder=${folder}`, form)
      .pipe(map((r) => r.data));
  }

  remove(publicId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void> | null>(
        `${this.base}/admin/uploads?publicId=${encodeURIComponent(publicId)}`,
      )
      .pipe(map(() => undefined));
  }
}

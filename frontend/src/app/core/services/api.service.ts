import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models';

type ParamValue = string | number | boolean | undefined | null | ReadonlyArray<string | number>;

/** Thin wrapper over HttpClient: prefixes the API base URL and unwraps the { data } envelope. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  get<T>(path: string, params?: Record<string, ParamValue>): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(this.url(path), { params: this.toParams(params) })
      .pipe(map((r) => r.data));
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(this.url(path), body).pipe(map((r) => r.data));
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.http.put<ApiResponse<T>>(this.url(path), body).pipe(map((r) => r.data));
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http.patch<ApiResponse<T>>(this.url(path), body).pipe(map((r) => r.data));
  }

  delete<T>(path: string): Observable<T> {
    return this.http
      .delete<ApiResponse<T> | null>(this.url(path))
      .pipe(map((r) => (r ? r.data : (undefined as T))));
  }

  private url(path: string): string {
    return `${this.base}/${path.replace(/^\/+/, '')}`;
  }

  private toParams(params?: Record<string, ParamValue>): HttpParams {
    let hp = new HttpParams();
    if (!params) return hp;
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) {
        for (const v of value) hp = hp.append(key, String(v));
      } else {
        hp = hp.set(key, String(value));
      }
    }
    return hp;
  }
}

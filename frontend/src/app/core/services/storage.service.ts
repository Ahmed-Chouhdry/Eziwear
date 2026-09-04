import { Injectable } from '@angular/core';

/** SSR-safe, exception-safe wrapper around localStorage. */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private get store(): Storage | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
      return null;
    }
  }

  get<T>(key: string, fallback: T): T {
    try {
      const raw = this.store?.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  getString(key: string): string | null {
    try {
      return this.store?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  set(key: string, value: unknown): void {
    try {
      this.store?.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch {
      /* quota / private mode — ignore */
    }
  }

  remove(key: string): void {
    try {
      this.store?.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly storage = inject(StorageService);
  private readonly key = environment.storageKeys.theme;

  private readonly _theme = signal<Theme>(this.readInitial());
  readonly theme = this._theme.asReadonly();
  readonly isDark = computed(() => this._theme() === 'dark');

  constructor() {
    effect(() => {
      const t = this._theme();
      this.doc.documentElement.setAttribute('data-theme', t);
      this.doc
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', t === 'dark' ? '#0B0B0D' : '#F5F2EA');
      this.storage.set(this.key, t);
    });
  }

  toggle(): void {
    this._theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  set(theme: Theme): void {
    this._theme.set(theme);
  }

  private readInitial(): Theme {
    try {
      const q = new URLSearchParams(this.doc.defaultView?.location.search ?? '').get('theme');
      if (q === 'dark' || q === 'light') return q;
    } catch {
      /* ignore */
    }
    const saved = this.storage.getString(this.key);
    if (saved === 'dark' || saved === 'light') return saved;
    try {
      return this.doc.defaultView?.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark';
    } catch {
      return 'dark';
    }
  }
}

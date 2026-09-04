import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  title?: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  success(message: string, title?: string) { this.push('success', message, title); }
  error(message: string, title?: string) { this.push('error', message, title); }
  info(message: string, title?: string) { this.push('info', message, title); }

  dismiss(id: number) {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(kind: ToastKind, message: string, title?: string) {
    const id = ++this.seq;
    this._toasts.update((list) => [...list, { id, kind, message, title }]);
    setTimeout(() => this.dismiss(id), kind === 'error' ? 6000 : 4000);
  }
}

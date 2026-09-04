import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Styles the confirm button as destructive (red) — use for delete/suspend/irreversible actions. */
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (result: boolean) => void;
}

/**
 * Promise-based replacement for window.confirm(), rendered as a themed modal
 * (`<ui-confirm-dialog />`, mounted once in the app root). Usage:
 *   if (!(await this.confirmSvc.confirm({ message: 'Delete this?', danger: true }))) return;
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly _state = signal<ConfirmState | null>(null);
  readonly state = this._state.asReadonly();

  confirm(options: ConfirmOptions | string): Promise<boolean> {
    const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      this._state.set({ ...opts, resolve });
    });
  }

  respond(result: boolean): void {
    const current = this._state();
    if (!current) return;
    this._state.set(null);
    current.resolve(result);
  }
}

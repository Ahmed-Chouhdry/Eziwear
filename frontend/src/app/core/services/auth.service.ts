import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResult, LoginPayload, RegisterPayload, User } from '../models';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';

export interface ForgotPasswordPayload {
  identifier: string;
}
export interface ResetPasswordPayload {
  token: string;
  password: string;
}
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
export interface UpdateProfilePayload {
  name: string;
  phone?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  private readonly tokenKey = environment.storageKeys.token;

  private readonly _token = signal<string | null>(this.storage.getString(this.tokenKey));
  private readonly _user = signal<User | null>(null);
  private readonly _ready = signal(false);

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly ready = this._ready.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());
  readonly isAdmin = computed(() => this._user()?.role === 'admin');

  /** Called once at startup — restores the session from a stored token. */
  init(): Observable<unknown> {
    if (!this._token()) {
      this._ready.set(true);
      return of(null);
    }
    return this.api.get<User>('auth/me').pipe(
      tap((u) => {
        this._user.set(u);
        this._ready.set(true);
      }),
      catchError(() => {
        this.clearSession();
        this._ready.set(true);
        return of(null);
      }),
    );
  }

  login(payload: LoginPayload): Observable<AuthResult> {
    return this.api.post<AuthResult>('auth/login', payload).pipe(tap((r) => this.setSession(r)));
  }

  register(payload: RegisterPayload): Observable<AuthResult> {
    return this.api.post<AuthResult>('auth/register', payload).pipe(tap((r) => this.setSession(r)));
  }

  forgotPassword(payload: ForgotPasswordPayload): Observable<{ resetToken?: string }> {
    return this.api.post<{ resetToken?: string }>('auth/forgot-password', payload);
  }

  resetPassword(payload: ResetPasswordPayload): Observable<{ reset: boolean }> {
    return this.api.post<{ reset: boolean }>('auth/reset-password', payload);
  }

  changePassword(payload: ChangePasswordPayload): Observable<{ changed: boolean }> {
    return this.api.post<{ changed: boolean }>('auth/change-password', payload);
  }

  updateProfile(payload: UpdateProfilePayload): Observable<User> {
    return this.api.patch<User>('auth/me', payload).pipe(tap((u) => this._user.set(u)));
  }

  loadProfile(): Observable<User> {
    return this.api.get<User>('auth/me').pipe(tap((u) => this._user.set(u)));
  }

  logout(redirectTo: string | null = '/'): void {
    this.clearSession();
    if (redirectTo) void this.router.navigateByUrl(redirectTo);
  }

  private setSession(result: AuthResult): void {
    this._token.set(result.token);
    this._user.set(result.user);
    this.storage.set(this.tokenKey, result.token);
  }

  private clearSession(): void {
    this._token.set(null);
    this._user.set(null);
    this.storage.remove(this.tokenKey);
  }
}

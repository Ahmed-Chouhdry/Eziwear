import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/** Global API error handling: friendly toasts + 401 redirect to login. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const auth = inject(AuthService);
  const router = inject(Router);

  // Auth endpoints report their own errors (wrong password etc.) — a 401 there
  // is expected and must not trigger the "session expired" logout/redirect.
  const isAuthCall = /\/auth\/(login|register|forgot-password|reset-password)$/.test(req.url);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const silent = req.headers.has('X-Silent-Error');
      const serverMessage = err.error?.message as string | undefined;

      if (err.status === 0) {
        if (!silent) toast.error('Network error. Please check your connection.');
      } else if (err.status === 401 && !isAuthCall) {
        auth.logout(null);
        router.navigate(['/auth/login'], { queryParams: { returnUrl: router.url } });
        if (!silent) toast.error('Your session expired. Please sign in again.');
      } else if (err.status === 403) {
        if (!silent) toast.error(serverMessage ?? 'You do not have permission to do that.');
      } else if (err.status >= 500) {
        if (!silent) toast.error('Something went wrong on our end. Please try again.');
      } else if (!silent) {
        toast.error(serverMessage ?? 'Request failed. Please try again.');
      }

      return throwError(() => err);
    }),
  );
};

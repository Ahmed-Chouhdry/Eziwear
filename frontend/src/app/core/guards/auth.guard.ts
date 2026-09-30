import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Protects customer routes (profile, wishlist, cart, orders). */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};

/** Order page: signed-in customers, or a guest holding the order's access token. */
export const orderViewGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated() || route.queryParamMap.has('token')) return true;
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};

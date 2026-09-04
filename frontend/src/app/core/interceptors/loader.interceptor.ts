import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoaderService } from '../services/loader.service';

/** Drives the global loading bar. Opt out with an `X-No-Loader` header. */
export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.headers.has('X-No-Loader')) {
    return next(req);
  }
  const loader = inject(LoaderService);
  loader.start();
  return next(req).pipe(finalize(() => loader.stop()));
};

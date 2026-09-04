import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api-error.js';
import { isProd } from '../config/env.js';

interface MysqlError extends Error {
  code?: string;
  errno?: number;
  sqlMessage?: string;
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let apiError: ApiError;

  if (err instanceof ApiError) {
    apiError = err;
  } else if (isDuplicateKey(err)) {
    apiError = ApiError.conflict('A record with those details already exists');
  } else {
    apiError = ApiError.internal();
  }

  if (apiError.statusCode >= 500) {
    req.log?.error({ err }, 'Unhandled error');
  } else {
    req.log?.warn({ err: (err as Error)?.message }, 'Request error');
  }

  res.status(apiError.statusCode).json({
    success: false,
    message: apiError.expose ? apiError.message : 'Something went wrong on our end',
    ...(apiError.errors ? { errors: apiError.errors } : {}),
    statusCode: apiError.statusCode,
    ...(isProd || apiError.statusCode < 500 ? {} : { stack: (err as Error)?.stack }),
  });
}

function isDuplicateKey(err: unknown): boolean {
  const e = err as MysqlError;
  return e?.code === 'ER_DUP_ENTRY' || e?.errno === 1062;
}

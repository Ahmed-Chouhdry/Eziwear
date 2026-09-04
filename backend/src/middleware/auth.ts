import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';

export type UserRole = 'customer' | 'admin';

export interface AuthPayload {
  sub: number;
  role: UserRole;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/** Requires a valid JWT. Attaches req.user. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = readToken(req);
  if (!token) return next(ApiError.unauthorized());
  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as unknown as AuthPayload;
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired session'));
  }
}

/** Attaches req.user when a token is present, but never rejects. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = readToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, env.JWT_SECRET) as unknown as AuthPayload;
    } catch {
      /* ignore — treat as guest */
    }
  }
  next();
}

/** Requires an authenticated user with one of the given roles. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
}

import type { Response } from 'express';

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Standard success envelope: { success, message?, data }. */
export function ok<T>(res: Response, data: T, message?: string, status = 200): Response {
  return res.status(status).json({ success: true, ...(message ? { message } : {}), data });
}

export function created<T>(res: Response, data: T, message = 'Created'): Response {
  return ok(res, data, message, 201);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

export function paginate<T>(items: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

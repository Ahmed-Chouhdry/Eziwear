import type { Request, Response } from 'express';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { created, ok } from '../../utils/response.js';
import { authService } from './auth.service.js';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    created(res, result, 'Account created');
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    ok(res, result, 'Signed in');
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, await authService.me(req.user.sub));
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.forgotPassword(req.body);
    ok(res, result, 'If that account exists, a reset link has been sent');
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body);
    ok(res, { reset: true }, 'Password updated — you can now sign in');
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, await authService.updateProfile(req.user.sub, req.body), 'Profile updated');
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized();
    await authService.changePassword(req.user.sub, req.body);
    ok(res, { changed: true }, 'Password changed');
  }),
};

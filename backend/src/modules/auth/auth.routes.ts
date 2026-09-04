import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rate-limit.js';
import { validate } from '../../middleware/validate.js';
import { authController } from './auth.controller.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from './auth.schemas.js';

export const authRoutes = Router();

authRoutes.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
authRoutes.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
authRoutes.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword,
);
authRoutes.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
);

authRoutes.get('/me', authenticate, authController.me);
authRoutes.patch(
  '/me',
  authenticate,
  validate({ body: updateProfileSchema }),
  authController.updateProfile,
);
authRoutes.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);

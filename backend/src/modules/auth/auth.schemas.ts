import { z } from 'zod';

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

const phone = z
  .string()
  .trim()
  .regex(/^[0-9+()\-\s]{7,20}$/, 'Enter a valid phone number');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  phone: phone.optional().or(z.literal('').transform(() => undefined)),
  password,
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or phone'),
  password: z.string().min(1, 'Enter your password'),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or phone'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Invalid reset link'),
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: password,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(120),
  phone: phone.optional().or(z.literal('').transform(() => undefined)),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

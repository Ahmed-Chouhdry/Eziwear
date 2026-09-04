import crypto from 'node:crypto';
import { db } from '../../config/db.js';
import { isProd } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { signToken, type AuthPayload } from '../../middleware/auth.js';
import type { UserRow } from '../../database/types.js';
import { ApiError } from '../../utils/api-error.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { minutesFromNow, toMysqlDateTime } from '../../utils/datetime.js';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from './auth.schemas.js';

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: 'customer' | 'admin';
  status: 'active' | 'suspended';
  createdAt: string;
}

const RESET_TTL_MINUTES = 30;

function toPublic(u: UserRow): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: u.status,
    createdAt: u.created_at,
  };
}

function issue(user: UserRow): { token: string; user: PublicUser } {
  const payload: AuthPayload = { sub: user.id, role: user.role, name: user.name };
  return { token: signToken(payload), user: toPublic(user) };
}

function looksLikeEmail(v: string): boolean {
  return v.includes('@');
}

async function findByIdentifier(identifier: string): Promise<UserRow | undefined> {
  const value = identifier.trim();
  return looksLikeEmail(value)
    ? db('users').whereRaw('LOWER(email) = ?', [value.toLowerCase()]).first()
    : db('users').where({ phone: value }).first();
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await db('users')
      .whereRaw('LOWER(email) = ?', [input.email])
      .first();
    if (existing) throw ApiError.conflict('An account with that email already exists');

    if (input.phone) {
      const phoneTaken = await db('users').where({ phone: input.phone }).first();
      if (phoneTaken) throw ApiError.conflict('An account with that phone already exists');
    }

    const password_hash = await hashPassword(input.password);
    const [id] = await db('users').insert({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      password_hash,
      role: 'customer',
      status: 'active',
    });

    const user = await db('users').where({ id }).first();
    return issue(user!);
  },

  async login(input: LoginInput) {
    const user = await findByIdentifier(input.identifier);
    const ok = user && (await verifyPassword(input.password, user.password_hash));
    if (!user || !ok) throw ApiError.unauthorized('Incorrect email/phone or password');
    if (user.status === 'suspended') throw ApiError.forbidden('This account has been suspended');

    return issue(user);
  },

  async me(userId: number): Promise<PublicUser> {
    const user = await db('users').where({ id: userId }).first();
    if (!user) throw ApiError.unauthorized();
    return toPublic(user);
  },

  async forgotPassword(input: ForgotPasswordInput): Promise<{ resetToken?: string }> {
    const user = await findByIdentifier(input.identifier);

    // Always behave the same whether or not the account exists.
    if (!user) return {};

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await db('password_resets').insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: minutesFromNow(RESET_TTL_MINUTES),
    });

    // Phase 4: no mail transport yet — log it, and expose it in non-prod for testing.
    logger.info({ userId: user.id }, 'Password reset requested');
    if (!isProd) return { resetToken: rawToken };
    return {};
  },

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(input.token).digest('hex');
    const row = await db('password_resets')
      .where({ token_hash: tokenHash })
      .whereNull('used_at')
      .where('expires_at', '>', toMysqlDateTime())
      .orderBy('id', 'desc')
      .first();

    if (!row) throw ApiError.badRequest('This reset link is invalid or has expired');

    const password_hash = await hashPassword(input.password);
    const now = toMysqlDateTime();
    await db.transaction(async (trx) => {
      await trx('users').where({ id: row.user_id }).update({ password_hash });
      // consume this token and invalidate any other outstanding ones for the user
      await trx('password_resets')
        .where({ user_id: row.user_id })
        .whereNull('used_at')
        .update({ used_at: now });
    });
  },

  async updateProfile(userId: number, input: UpdateProfileInput): Promise<PublicUser> {
    if (input.phone) {
      const taken = await db('users')
        .where({ phone: input.phone })
        .whereNot({ id: userId })
        .first();
      if (taken) throw ApiError.conflict('That phone number is already in use');
    }
    await db('users')
      .where({ id: userId })
      .update({ name: input.name, phone: input.phone ?? null });
    return this.me(userId);
  },

  async changePassword(userId: number, input: ChangePasswordInput): Promise<void> {
    const user = await db('users').where({ id: userId }).first();
    if (!user) throw ApiError.unauthorized();

    const ok = await verifyPassword(input.currentPassword, user.password_hash);
    if (!ok) throw ApiError.badRequest('Current password is incorrect');

    const password_hash = await hashPassword(input.newPassword);
    await db('users').where({ id: userId }).update({ password_hash });
  },
};

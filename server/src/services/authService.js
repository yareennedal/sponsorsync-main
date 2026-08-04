import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { normalizeEmail } from '../utils/normalizeEmail.js';
import { signToken } from '../utils/jwt.js';
import { createAuditLog } from '../utils/audit.js';
import { AppError } from '../utils/AppError.js';
import { passwordPolicySchema } from '../validators/authValidators.js';

// Same generic 401 for a missing user and an incorrect password — never
// reveals whether the email exists.
const INVALID_CREDENTIALS = new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة.', {
  code: 'AUTH_INVALID_CREDENTIALS',
  status: 401,
});

export async function login({ email, password, rememberMe = false, requestId }) {
  const normalized = normalizeEmail(email);
  const user = await User.findOne({ where: { email: normalized } });

  // Always run a bcrypt compare even if the user is missing, to keep timing
  // roughly constant. ponytail: not a full constant-time fix, but avoids the
  // obvious early-return oracle. Dummy hash is a valid bcrypt string of "x".
  const hash = user?.passwordHash || '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq4V3Z1.7p1UkXQ2.6Z1p1r';
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) throw INVALID_CREDENTIALS;
  if (!user.isActive) {
    throw new AppError('تم تعطيل هذا الحساب. يرجى التواصل مع المسؤول.', {
      code: 'AUTH_ACCOUNT_DISABLED',
      status: 403,
    });
  }

  await user.update({ lastLoginAt: new Date() });
  await createAuditLog({
    actorUserId: user.id,
    action: 'AUTH_LOGIN_SUCCESS',
    entityType: 'user',
    entityId: user.id,
    metadata: { requestId },
  });

  const token = signToken(user, rememberMe);
  return { user, token };
}

export async function recordFailedLogin({ email, requestId }) {
  // Safe failed-login entry: never records the password or whether the email exists.
  await createAuditLog({
    actorUserId: null,
    action: 'AUTH_LOGIN_FAILED',
    entityType: 'user',
    entityId: null,
    metadata: { requestId, attemptedEmail: normalizeEmail(email) },
  });
}

export async function changePassword({ user, currentPassword, newPassword, requestId }) {
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    throw new AppError('كلمة المرور الحالية غير صحيحة.', {
      code: 'AUTH_WRONG_PASSWORD',
      status: 400,
    });
  }
  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    throw new AppError('يجب أن تختلف كلمة المرور الجديدة عن كلمة المرور الحالية.', {
      code: 'AUTH_PASSWORD_REUSE',
      status: 400,
    });
  }
  passwordPolicySchema.parse(newPassword);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  // Bump token_version: invalidates all existing tokens (this one included).
  // The client must sign in again with the new password.
  await user.update({
    passwordHash,
    mustChangePassword: false,
    tokenVersion: user.tokenVersion + 1,
  });
  await createAuditLog({
    actorUserId: user.id,
    action: 'USER_PASSWORD_CHANGED',
    entityType: 'user',
    entityId: user.id,
    metadata: { requestId },
  });

  return user;
}

// --- Self-service profile ---------------------------------------------------
//
// Name only. Email is the login identity and is changed by an admin through
// PATCH /api/users/:id — the self-service OTP flow that used to live here was
// removed along with the forgotten-password flow. See docs/roles-and-access.md.

export async function updateOwnProfile({ user, fullName, requestId }) {
  const before = { fullName: user.fullName };
  await user.update({ fullName });

  await createAuditLog({
    actorUserId: user.id,
    action: 'USER_PROFILE_UPDATED',
    entityType: 'user',
    entityId: user.id,
    beforeValues: before,
    afterValues: { fullName: user.fullName },
    metadata: { requestId },
  });

  return user;
}

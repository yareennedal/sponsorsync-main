import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  loginSchema,
  changePasswordSchema,
  updateOwnProfileSchema,
} from '../validators/authValidators.js';
import {
  login,
  recordFailedLogin,
  changePassword,
  updateOwnProfile,
} from '../services/authService.js';
import { safeUser } from '../utils/safeUser.js';
import { createAuditLog } from '../utils/audit.js';
import { sessionCookieOptions, clearCookieOptions, cookieName } from '../utils/cookies.js';
import { env } from '../config/env.js';

export const authRouter = Router();

// ponytail: single-process limiter on login; switch to Upstash if horizontally scaled.
const skipTest = () => env.nodeEnv === 'test';
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  skip: skipTest,
});
// There are no OTP routes left to limit: both the forgotten-password and email-change flows
// were removed, so this router has exactly one unauthenticated endpoint (login).
// See docs/roles-and-access.md.

authRouter.post(
  '/auth/login',
  loginLimiter,
  validateRequest({ body: loginSchema }),
  asyncHandler(async (req, res, next) => {
    try {
      const { user, token } = await login({ ...req.body, requestId: req.id });
      res.cookie(cookieName(), token, sessionCookieOptions(req.body.rememberMe));
      return res.json({ success: true, data: { user: safeUser(user) } });
    } catch (err) {
      if (err.status === 401 || err.code === 'AUTH_INVALID_CREDENTIALS') {
        await recordFailedLogin({ email: req.body.email, requestId: req.id });
      }
      return next(err);
    }
  }),
);

authRouter.get(
  '/auth/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: { user: safeUser(req.user) } });
  }),
);

authRouter.patch(
  '/auth/me',
  authenticate,
  validateRequest({ body: updateOwnProfileSchema }),
  asyncHandler(async (req, res) => {
    const user = await updateOwnProfile({
      user: req.user,
      fullName: req.body.fullName,
      requestId: req.id,
    });
    res.json({ success: true, data: { user: safeUser(user) } });
  }),
);

authRouter.post(
  '/auth/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    res.clearCookie(cookieName(), clearCookieOptions());
    await createAuditLog({
      actorUserId: req.user.id,
      action: 'AUTH_LOGOUT',
      entityType: 'user',
      entityId: req.user.id,
      metadata: { requestId: req.id },
    });
    res.json({ success: true, data: null });
  }),
);

// Limited like login: it takes a currentPassword, so an attacker holding a stolen session
// could otherwise grind ~300 bcrypt guesses per window to recover the plaintext password.
authRouter.post(
  '/auth/change-password',
  authenticate,
  loginLimiter,
  validateRequest({ body: changePasswordSchema }),
  asyncHandler(async (req, res) => {
    await changePassword({ user: req.user, ...req.body, requestId: req.id });
    // Clear the old session; require a new login with the new password.
    res.clearCookie(cookieName(), clearCookieOptions());
    res.json({ success: true, data: null });
  }),
);

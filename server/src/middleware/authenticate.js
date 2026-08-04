import { User } from '../models/index.js';
import { verifyToken } from '../utils/jwt.js';
import { cookieName } from '../utils/cookies.js';
import { AppError } from '../utils/AppError.js';

// Routes a user still holding a temporary password may reach. Matched on originalUrl
// because the routers mount at different prefixes ('/api' and '/api/users'), which makes
// req.path relative and therefore ambiguous between them.
const PASSWORD_CHANGE_EXEMPT = new Set([
  '/api/auth/change-password',
  '/api/auth/logout',
  '/api/auth/me',
]);

function pathOf(req) {
  return (req.originalUrl || '').split('?')[0].replace(/\/+$/, '') || '/';
}

// Proves the request belongs to an active database user. Reloads the DB user
// on every protected request so a changed role or disabled account takes effect
// immediately, without waiting for token expiry. Compares tokenVersion so a
// bumped version (password change / deactivation) invalidates the token.
export async function authenticate(req, _res, next) {
  try {
    const token = req.cookies?.[cookieName()];
    if (!token)
      throw new AppError('يجب تسجيل الدخول للمتابعة.', { code: 'AUTH_REQUIRED', status: 401 });

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new AppError('الجلسة غير صالحة أو منتهية الصلاحية.', {
        code: 'AUTH_INVALID_TOKEN',
        status: 401,
      });
    }

    const user = await User.findByPk(payload.sub);
    if (!user)
      throw new AppError('الجلسة غير صالحة أو منتهية الصلاحية.', {
        code: 'AUTH_INVALID_TOKEN',
        status: 401,
      });
    // 401, not 403: this means "your session is no longer valid", which is what the client's
    // interceptor acts on. 403 means authenticated-but-not-permitted (authorizeRoles' job),
    // and the interceptor ignores it — leaving a deactivated user in a logged-in-looking UI
    // where every request fails. The login path keeps 403; there is no session there yet.
    if (!user.isActive)
      throw new AppError('تم تعطيل هذا الحساب.', {
        code: 'AUTH_ACCOUNT_DISABLED',
        status: 401,
      });
    if (user.tokenVersion !== payload.v) {
      throw new AppError('لم تعد الجلسة صالحة. يرجى تسجيل الدخول مجدداً.', {
        code: 'AUTH_TOKEN_VERSION_MISMATCH',
        status: 401,
      });
    }

    // A temporary password must actually be temporary. Enforcement used to be a single
    // navigate() on the login page, so typing /app or calling the API directly walked past
    // it and the admin-known password stayed valid indefinitely. The client redirect is now
    // UX; this is the control. /auth/me stays reachable so the client can read the flag.
    if (user.mustChangePassword && !PASSWORD_CHANGE_EXEMPT.has(pathOf(req))) {
      throw new AppError('يجب تغيير كلمة المرور قبل المتابعة.', {
        code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
        status: 403,
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

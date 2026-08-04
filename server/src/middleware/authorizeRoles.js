import { AppError } from '../utils/AppError.js';

// Rejects authenticated users whose current database role is not in the allowed list.
// Frontend may hide controls for UX, but this is the authority.
export function authorizeRoles(...allowedRoles) {
  return function authorize(req, _res, next) {
    if (!req.user)
      return next(
        new AppError('يجب تسجيل الدخول للمتابعة.', { code: 'AUTH_REQUIRED', status: 401 }),
      );
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('ليست لديك صلاحية لتنفيذ هذا الإجراء.', {
          code: 'AUTH_FORBIDDEN',
          status: 403,
        }),
      );
    }
    next();
  };
}

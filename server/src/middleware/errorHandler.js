export function errorHandler(err, req, res, _next) {
  // A ZodError thrown outside validateRequest — services call passwordPolicySchema
  // directly — carries no numeric status, so it used to fall through as a 500. A
  // weak new password answered "حدث خطأ غير متوقع" instead of stating the policy.
  if (err?.name === 'ZodError' && Array.isArray(err.issues)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.issues[0]?.message || 'البيانات المُدخلة غير صالحة.',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
  }

  // A check-then-insert race on a unique index (two admins creating the same email at once)
  // produced a 500. The DB constraint is the real guarantee; map it to the same 409 the
  // pre-check returns, so every table Plans 2-4 add inherits the correct status for free.
  if (err?.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'RESOURCE_CONFLICT',
        message: 'هذه القيمة مستخدمة بالفعل.',
        details: null,
      },
    });
  }

  const isAppError = err && typeof err.status === 'number';
  const status = isAppError ? err.status : 500;
  // Only echo a code the application chose. Reading err.code unconditionally returned
  // Postgres and Node internals ('23505', 'ECONNREFUSED') to the client, which fingerprints
  // the stack and pollutes the code vocabulary the client switches on.
  const code = isAppError ? err.code || 'INTERNAL_ERROR' : 'INTERNAL_ERROR';
  const message = isAppError ? err.message : 'حدث خطأ غير متوقع. يرجى المحاولة مجدداً.';
  if (status >= 500) {
    // ponytail: never leak stack/internals to clients; log server-side only.
    console.error(`[${req.id || '-'}] ${code}:`, err);
  }
  res.status(status).json({
    success: false,
    error: { code, message, details: err?.details ?? null },
  });
}

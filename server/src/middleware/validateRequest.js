// Validates req.body / req.query / req.params against a Zod schema.
// On success, replaces the validated values with parsed output.
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export function validateRequest({ body, query, params } = {}) {
  return (req, _res, next) => {
    try {
      if (params) req.params = params.parse(req.params);
      if (body) req.body = body.parse(req.body);
      if (query) req.query = query.parse(req.query);
      next();
    } catch (err) {
      // Only a validation failure becomes a 400. Catching everything meant an unrelated
      // TypeError in here would be reported as bad client input — the same class of bug
      // this project already shipped once. (Express 5 makes req.query getter-only, which
      // would throw exactly that way.)
      if (!(err instanceof ZodError)) {
        next(err);
        return;
      }
      const details =
        err.errors?.map((e) => ({ path: e.path.join('.'), message: e.message })) ?? null;
      next(
        new AppError(details?.[0]?.message || 'البيانات المُدخلة غير صالحة.', {
          code: 'VALIDATION_ERROR',
          status: 400,
          details,
        }),
      );
    }
  };
}

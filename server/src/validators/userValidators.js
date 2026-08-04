import { z } from 'zod';
import { passwordPolicySchema } from './authValidators.js';

const ROLE_ENUM = z.enum(['ADMIN', 'LEADER', 'MEMBER', 'SUPERVISOR'], {
  message: 'الدور المحدد غير صالح.',
});

// Zod's defaults are English and surface verbatim in the admin dialogs.
const EMAIL = { message: 'يرجى إدخال بريد إلكتروني صحيح.' };
const NAME_REQUIRED = { message: 'الاسم مطلوب.' };
const NAME_MAX = { message: 'يجب ألا يزيد الاسم عن 100 حرف.' };

// The client sends every filter on every request, so unset filters arrive as ''.
// Treat blank as absent rather than as an invalid enum value.
const blankToUndefined = (schema) => z.preprocess((v) => (v === '' ? undefined : v), schema);

// .trim() matches updateOwnProfileSchema: without it "   " passes min(1) and creates a user
// whose name cell renders blank and who can never be found by search.
export const createUserSchema = z.object({
  fullName: z.string().trim().min(1, NAME_REQUIRED).max(100, NAME_MAX),
  email: z.string().email(EMAIL),
  role: ROLE_ENUM,
  temporaryPassword: passwordPolicySchema,
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1, NAME_REQUIRED).max(100, NAME_MAX).optional(),
  email: z.string().email(EMAIL).optional(),
  role: ROLE_ENUM.optional(),
});

// An unvalidated :id reached findByPk and Postgres raised 22P02 (invalid uuid syntax),
// which has no numeric status and so surfaced as a 500 instead of a 404. Lowercasing also
// closes the self-deactivation guard bypass: that guard is a JS string compare, while
// Postgres matches uuids canonically, so an upper-cased id found the row and skipped it.
export const userIdParamsSchema = z.object({
  id: z
    .string()
    .uuid({ message: 'معرّف المستخدم غير صالح.' })
    .transform((v) => v.toLowerCase()),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const resetPasswordSchema = z.object({
  temporaryPassword: passwordPolicySchema,
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: blankToUndefined(z.string().trim().min(1).max(100).optional()),
  role: blankToUndefined(ROLE_ENUM.optional()),
  status: blankToUndefined(z.enum(['active', 'disabled']).optional()),
});

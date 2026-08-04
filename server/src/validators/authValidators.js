import { z } from 'zod';

// Zod's built-in messages are English and reach the user verbatim: both password pages render
// error.details[0].message in preference to the Arabic top-level message. Every constraint
// that a user can trip therefore carries its own Arabic message.
const EMAIL = { message: 'يرجى إدخال بريد إلكتروني صحيح.' };
const REQUIRED = { message: 'هذا الحقل مطلوب.' };
const MIN_PASSWORD = { message: 'يجب ألا تقل كلمة المرور عن 10 خانات.' };

export const loginSchema = z.object({
  email: z.string().email(EMAIL),
  password: z.string().min(1, REQUIRED),
  // Defaults to false: an omitted flag should give the shorter session, not a 30-day one.
  rememberMe: z.boolean().optional().default(false),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, REQUIRED),
    newPassword: z.string().min(10, MIN_PASSWORD),
    confirmPassword: z.string().min(1, REQUIRED),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'كلمتا المرور غير متطابقتين.',
  });

// Documented password policy: >=10 chars and >=3 of the 4 character categories.
export const passwordPolicySchema = z
  .string()
  .min(10, MIN_PASSWORD)
  .refine(
    (pw) => {
      const categories = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) =>
        re.test(pw),
      ).length;
      return categories >= 3;
    },
    {
      message:
        'يجب أن تحتوي كلمة المرور على ثلاثة على الأقل مما يلي: حرف كبير، حرف صغير، رقم، رمز.',
    },
  );

// Self-service profile. Name only: email is the login identity and is changed by an admin
// through PATCH /api/users/:id, while role/isActive stay admin-controlled because they are
// authorization. This is the whole self-service surface.
export const updateOwnProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, REQUIRED)
    .max(100, { message: 'يجب ألا يزيد الاسم عن 100 حرف.' }),
});

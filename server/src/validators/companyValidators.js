import { z } from 'zod';
import { CONTACT_METHODS } from '../constants/plan2Constants.js';

const REQUIRED = { message: 'هذا الحقل مطلوب.' };
const UUID = { message: 'المعرّف غير صالح.' };
const CONTACT_METHOD = { message: 'طريقة التواصل غير صالحة.' };

const blankToUndefined = (schema) => z.preprocess((v) => (v === '' ? undefined : v), schema);

const uuid = z
  .string()
  .uuid(UUID)
  .transform((value) => value.toLowerCase());

const trimmedString = (max = 255) =>
  z
    .string()
    .trim()
    .min(1, REQUIRED)
    .max(max, { message: `يجب ألا يزيد النص عن ${max} حرف.` });

const optionalNullableString = z.union([z.string().trim().max(255), z.null()]).optional();
const optionalNullableText = z.union([z.string().trim().max(5000), z.null()]).optional();
const contactMethod = z.enum(CONTACT_METHODS, CONTACT_METHOD);

const atLeastOneField = (data, ctx) => {
  const keys = Object.keys(data).filter((key) => key !== 'overrideReason');
  if (keys.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'يجب إرسال حقل واحد على الأقل للتحديث.',
    });
  }
};

const contactBaseSchema = z.object({
  fullName: trimmedString(255),
  position: optionalNullableString,
  email: optionalNullableString,
  phone: optionalNullableString,
  preferredContactMethod: contactMethod.default('EMAIL'),
  notes: optionalNullableText,
  isPrimary: z.boolean().optional().default(false),
});

const contactChannelsRequired = (data, ctx) => {
  if (!String(data.email ?? '').trim() && !String(data.phone ?? '').trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['email'],
      message: 'يجب إدخال بريد إلكتروني أو رقم هاتف للتواصل.',
    });
  }
};

export const listCompaniesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: blankToUndefined(z.string().trim().min(1).max(100).optional()),
  sector: blankToUndefined(z.string().trim().min(1).max(100).optional()),
  city: blankToUndefined(z.string().trim().min(1).max(100).optional()),
  archived: blankToUndefined(
    z
      .preprocess((value) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
      }, z.boolean().optional())
      .default(false),
  ),
});

export const duplicateCompaniesQuerySchema = z.object({
  name: blankToUndefined(z.string().trim().min(1).max(255).optional()),
  website: blankToUndefined(z.string().trim().min(1).max(255).optional()),
  generalEmail: blankToUndefined(z.string().trim().min(1).max(255).optional()),
  email: blankToUndefined(z.string().trim().min(1).max(255).optional()),
  phone: blankToUndefined(z.string().trim().min(1).max(50).optional()),
  city: blankToUndefined(z.string().trim().min(1).max(100).optional()),
  excludeCompanyId: blankToUndefined(uuid.optional()),
});

export const companyIdParamsSchema = z.object({
  companyId: uuid,
});

export const companyContactParamsSchema = z.object({
  companyId: uuid,
  contactId: uuid,
});

export const createCompanySchema = z
  .object({
    name: trimmedString(255),
    sector: trimmedString(100),
    city: optionalNullableString,
    website: optionalNullableString,
    generalEmail: optionalNullableString,
    phone: optionalNullableString,
    address: optionalNullableText,
    notes: optionalNullableText,
    overrideReason: z.string().trim().max(500).optional(),
    contact: contactBaseSchema.strict().superRefine(contactChannelsRequired).optional(),
  })
  .strict();

export const updateCompanySchema = z
  .object({
    name: trimmedString(255).optional(),
    sector: trimmedString(100).optional(),
    city: optionalNullableString,
    website: optionalNullableString,
    generalEmail: optionalNullableString,
    phone: optionalNullableString,
    address: optionalNullableText,
    notes: optionalNullableText,
    overrideReason: z.string().trim().max(500).optional(),
  })
  .strict()
  .superRefine(atLeastOneField);

export const archiveCompanySchema = z
  .object({
    archived: z.boolean(),
  })
  .strict();

export const createCompanyContactSchema = contactBaseSchema
  .strict()
  .superRefine(contactChannelsRequired);

export const updateCompanyContactSchema = z
  .object({
    fullName: trimmedString(255).optional(),
    position: optionalNullableString,
    email: optionalNullableString,
    phone: optionalNullableString,
    preferredContactMethod: contactMethod.optional(),
    notes: optionalNullableText,
    isPrimary: z.boolean().optional(),
  })
  .strict()
  .superRefine(atLeastOneField);

export const archiveCompanyContactSchema = z
  .object({
    archived: z.boolean(),
  })
  .strict();

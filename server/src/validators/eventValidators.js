import { z } from 'zod';
import { EVENT_STATUSES } from '../constants/plan2Constants.js';

const REQUIRED = { message: 'هذا الحقل مطلوب.' };
const UUID = { message: 'المعرّف غير صالح.' };
const DATE = { message: 'يرجى إدخال تاريخ صحيح بصيغة YYYY-MM-DD.' };
const MONEY = { message: 'يرجى إدخال مبلغ غير سالب وبحد أقصى منزلتين عشريتين.' };
const STATUS = { message: 'حالة الفعالية غير صالحة.' };
const EVENT_MEMBER_ROLE = { message: 'دور عضو الفريق غير صالح.' };

const blankToUndefined = (schema) => z.preprocess((v) => (v === '' ? undefined : v), schema);

const uuid = z
  .string()
  .uuid(UUID)
  .transform((v) => v.toLowerCase());

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, DATE)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, DATE);

const decimalString = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), MONEY)
  .transform((value) => Number(value).toFixed(2));

const trimmedString = (max = 255) =>
  z
    .string()
    .trim()
    .min(1, REQUIRED)
    .max(max, { message: `يجب ألا يزيد النص عن ${max} حرف.` });

const nullableText = z.union([z.string().trim().max(5000), z.null()]);
const optionalNullableString = z.union([z.string().trim().max(255), z.null()]).optional();
const stringArray = z
  .array(trimmedString(100))
  .default([])
  .transform((items) => items.map((item) => item.trim()));
const optionalStringArray = z.array(trimmedString(100)).optional();

const eventStatus = z.enum(EVENT_STATUSES, STATUS);
const eventMemberCandidateRole = z.enum(['MEMBER', 'SUPERVISOR'], EVENT_MEMBER_ROLE);

function validateDeadline(data, ctx) {
  const eventDate = data.eventDate;
  const deadline = data.sponsorshipDeadline;
  if (eventDate && deadline && deadline > eventDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sponsorshipDeadline'],
      message: 'يجب أن يكون موعد الرعاية قبل تاريخ الفعالية أو في نفس اليوم.',
    });
  }
}

const atLeastOneField = (data, ctx) => {
  if (Object.keys(data).length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'يجب إرسال حقل واحد على الأقل للتحديث.',
    });
  }
};

export const eventIdParamsSchema = z.object({
  eventId: uuid,
});

export const eventMemberParamsSchema = z.object({
  eventId: uuid,
  userId: uuid,
});

export const eventPackageParamsSchema = z.object({
  eventId: uuid,
  packageId: uuid,
});

export const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: blankToUndefined(z.string().trim().min(1).max(100).optional()),
  status: blankToUndefined(eventStatus.optional()),
  fromDate: blankToUndefined(dateOnly.optional()),
  toDate: blankToUndefined(dateOnly.optional()),
  archived: blankToUndefined(
    z
      .preprocess((v) => {
        if (v === 'true') return true;
        if (v === 'false') return false;
        return v;
      }, z.boolean().optional())
      .default(false),
  ),
});

export const createEventSchema = z
  .object({
    name: trimmedString(255),
    description: nullableText.optional(),
    category: trimmedString(100),
    eventDate: dateOnly,
    location: optionalNullableString,
    financialTarget: decimalString.default('0.00'),
    sponsorshipDeadline: dateOnly.nullable().optional(),
    targetSectors: stringArray,
    targetCities: stringArray,
    status: eventStatus.optional(),
    leaderId: uuid.optional(),
  })
  .strict()
  .superRefine(validateDeadline);

export const updateEventSchema = z
  .object({
    name: trimmedString(255).optional(),
    description: nullableText.optional(),
    category: trimmedString(100).optional(),
    eventDate: dateOnly.optional(),
    location: optionalNullableString,
    financialTarget: decimalString.optional(),
    sponsorshipDeadline: dateOnly.nullable().optional(),
    targetSectors: optionalStringArray,
    targetCities: optionalStringArray,
  })
  .strict()
  .superRefine((data, ctx) => {
    atLeastOneField(data, ctx);
    validateDeadline(data, ctx);
  });

export const updateEventStatusSchema = z.object({
  status: eventStatus,
});

export const transferEventLeaderSchema = z.object({
  leaderId: uuid,
  reason: trimmedString(500),
});

export const addEventMemberSchema = z.object({
  userId: uuid,
});

export const listEventMemberCandidatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: blankToUndefined(z.string().trim().min(1).max(100).optional()),
  role: blankToUndefined(eventMemberCandidateRole.optional()),
});

export const createSponsorshipPackageSchema = z
  .object({
    name: trimmedString(100),
    amount: decimalString.default('0.00'),
    benefits: trimmedString(5000),
    displayOrder: z.coerce.number().int().default(0),
  })
  .strict();

export const updateSponsorshipPackageSchema = z
  .object({
    name: trimmedString(100).optional(),
    amount: decimalString.optional(),
    benefits: trimmedString(5000).optional(),
    displayOrder: z.coerce.number().int().optional(),
  })
  .strict()
  .superRefine(atLeastOneField);

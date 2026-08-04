export const COMPANY_SECTOR_OPTIONS = [
  { value: 'Technology', label: 'تقنية' },
  { value: 'Education', label: 'تعليم' },
  { value: 'Finance', label: 'مالية' },
  { value: 'Healthcare', label: 'صحة' },
  { value: 'Retail', label: 'تجزئة' },
  { value: 'Logistics', label: 'لوجستيات' },
  { value: 'Other', label: 'أخرى' },
];

export const COMPANY_SECTOR_LABELS = Object.fromEntries(
  COMPANY_SECTOR_OPTIONS.map((sector) => [sector.value, sector.label]),
);

export const CONTACT_METHOD_OPTIONS = [
  { value: 'EMAIL', label: 'بريد إلكتروني' },
  { value: 'PHONE', label: 'هاتف' },
  { value: 'WHATSAPP', label: 'واتساب' },
  { value: 'MEETING', label: 'اجتماع' },
  { value: 'OTHER', label: 'أخرى' },
];

export const CONTACT_METHOD_LABELS = Object.fromEntries(
  CONTACT_METHOD_OPTIONS.map((method) => [method.value, method.label]),
);

export const DUPLICATE_CONFIDENCE_LABELS = {
  HIGH: 'تشابه عالٍ',
  MEDIUM: 'تشابه متوسط',
  LOW: 'تشابه منخفض',
};

export const DUPLICATE_CONFIDENCE_COLORS = {
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'default',
};

export const EMPTY_COMPANY_FORM = {
  name: '',
  sector: 'Technology',
  city: '',
  website: '',
  generalEmail: '',
  phone: '',
  address: '',
  notes: '',
  contactFullName: '',
  contactPosition: '',
  contactEmail: '',
  contactPhone: '',
  contactPreferredContactMethod: 'EMAIL',
  contactIsPrimary: true,
  overrideReason: '',
};

export const EMPTY_CONTACT_FORM = {
  fullName: '',
  position: '',
  email: '',
  phone: '',
  preferredContactMethod: 'EMAIL',
  notes: '',
  isPrimary: false,
};

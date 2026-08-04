export const EVENT_STATUS_LABELS = {
  DRAFT: 'مسودة',
  ACTIVE: 'نشطة',
  COMPLETED: 'مكتملة',
  CANCELLED: 'ملغاة',
  ARCHIVED: 'مؤرشفة',
};

export const EVENT_STATUS_COLORS = {
  DRAFT: 'default',
  ACTIVE: 'success',
  COMPLETED: 'primary',
  CANCELLED: 'warning',
  ARCHIVED: 'default',
};

export const CREATE_STATUS_OPTIONS = ['DRAFT', 'ACTIVE'];
export const EVENT_STATUS_OPTIONS = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED'];

export const EVENT_CATEGORY_OPTIONS = [
  { value: 'Technology', label: 'تقنية' },
  { value: 'Education', label: 'تعليم' },
  { value: 'Business', label: 'أعمال' },
  { value: 'Sports', label: 'رياضة' },
  { value: 'Culture', label: 'ثقافة' },
  { value: 'Community', label: 'مجتمع' },
];

export const EVENT_CATEGORY_LABELS = Object.fromEntries(
  EVENT_CATEGORY_OPTIONS.map((category) => [category.value, category.label]),
);

export const MEMBER_CANDIDATE_ROLES = ['MEMBER', 'SUPERVISOR'];

export const EMPTY_EVENT_FORM = {
  name: '',
  description: '',
  category: 'Technology',
  eventDate: '',
  location: '',
  financialTarget: '0.00',
  sponsorshipDeadline: '',
  targetSectorsText: '',
  targetCitiesText: '',
  status: 'DRAFT',
  leaderId: '',
};

export const EMPTY_PACKAGE_FORM = {
  name: '',
  amount: '0.00',
  benefits: '',
  displayOrder: 0,
};

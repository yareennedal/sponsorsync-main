// 'ar' alone resolves to the arab numbering system, so dates rendered as ٢٤ يوليو ٢٠٢٦
// while every other number in the app (counts, OTP inputs, pagination) is Latin.
// 'ar-u-nu-latn' keeps Arabic month names with Latin digits, matching the rest of the UI.
const dateTimeFormat = new Intl.DateTimeFormat('ar-u-nu-latn', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDateTime(value, fallback = 'لا يوجد') {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : dateTimeFormat.format(date);
}

import { EMPTY_COMPANY_FORM, EMPTY_CONTACT_FORM } from './companyConstants';

export function companyToForm(company) {
  if (!company) return EMPTY_COMPANY_FORM;
  return {
    ...EMPTY_COMPANY_FORM,
    name: company.name ?? '',
    sector: company.sector ?? EMPTY_COMPANY_FORM.sector,
    city: company.city ?? '',
    website: company.website ?? '',
    generalEmail: company.generalEmail ?? '',
    phone: company.phone ?? '',
    address: company.address ?? '',
    notes: company.notes ?? '',
  };
}

export function buildCompanyPayload(form, { includeContact = false } = {}) {
  const payload = {
    name: form.name,
    sector: form.sector,
    city: form.city.trim() || null,
    website: form.website.trim() || null,
    generalEmail: form.generalEmail.trim() || null,
    phone: form.phone.trim() || null,
    address: form.address.trim() || null,
    notes: form.notes.trim() || null,
    ...(form.overrideReason.trim() ? { overrideReason: form.overrideReason.trim() } : {}),
  };

  const hasContact =
    form.contactFullName.trim() || form.contactEmail.trim() || form.contactPhone.trim();
  if (includeContact && hasContact) {
    payload.contact = {
      fullName: form.contactFullName,
      position: form.contactPosition.trim() || null,
      email: form.contactEmail.trim() || null,
      phone: form.contactPhone.trim() || null,
      preferredContactMethod: form.contactPreferredContactMethod,
      isPrimary: form.contactIsPrimary,
    };
  }

  return payload;
}

export function contactToForm(contact) {
  if (!contact) return EMPTY_CONTACT_FORM;
  return {
    fullName: contact.fullName ?? '',
    position: contact.position ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    preferredContactMethod: contact.preferredContactMethod ?? 'EMAIL',
    notes: contact.notes ?? '',
    isPrimary: Boolean(contact.isPrimary),
  };
}

export function buildContactPayload(form) {
  return {
    fullName: form.fullName,
    position: form.position.trim() || null,
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    preferredContactMethod: form.preferredContactMethod,
    notes: form.notes.trim() || null,
    isPrimary: form.isPrimary,
  };
}

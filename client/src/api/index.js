import api from './client';

export const authApi = {
  // _skipRedirect: a 401 here means "wrong password", not "your session expired". Without it
  // the interceptor treats a failed login as expiry and fires POST /auth/logout against the
  // caller's still-valid cookie, so one typo signs you out of every other open tab.
  login: (credentials) => api.post('/api/auth/login', credentials, { _skipRedirect: true }),
  me: (config) => api.get('/api/auth/me', config),
  logout: (config) => api.post('/api/auth/logout', null, config),
  changePassword: (payload) => api.post('/api/auth/change-password', payload),
  updateProfile: (payload) => api.patch('/api/auth/me', payload),
};

export const userApi = {
  list: (params) => api.get('/api/users', { params }),
  create: (payload) => api.post('/api/users', payload),
  update: (id, payload) => api.patch(`/api/users/${id}`, payload),
  updateStatus: (id, isActive) => api.patch(`/api/users/${id}/status`, { isActive }),
  resetPassword: (id, temporaryPassword) =>
    api.post(`/api/users/${id}/reset-password`, { temporaryPassword }),
};

export const eventApi = {
  list: (params) => api.get('/api/events', { params }),
  create: (payload) => api.post('/api/events', payload),
  get: (id) => api.get(`/api/events/${id}`),
  update: (id, payload) => api.patch(`/api/events/${id}`, payload),
  updateStatus: (id, status) => api.patch(`/api/events/${id}/status`, { status }),
  memberCandidates: (id, params) => api.get(`/api/events/${id}/member-candidates`, { params }),
  listMembers: (id) => api.get(`/api/events/${id}/members`),
  addMember: (id, userId) => api.post(`/api/events/${id}/members`, { userId }),
  removeMember: (id, userId) => api.delete(`/api/events/${id}/members/${userId}`),
  listPackages: (id) => api.get(`/api/events/${id}/packages`),
  createPackage: (id, payload) => api.post(`/api/events/${id}/packages`, payload),
  updatePackage: (id, packageId, payload) =>
    api.patch(`/api/events/${id}/packages/${packageId}`, payload),
  deactivatePackage: (id, packageId) => api.delete(`/api/events/${id}/packages/${packageId}`),
};

export const companyApi = {
  list: (params) => api.get('/api/companies', { params }),
  duplicates: (params) => api.get('/api/companies/duplicates', { params }),
  create: (payload) => api.post('/api/companies', payload),
  get: (id) => api.get(`/api/companies/${id}`),
  update: (id, payload) => api.patch(`/api/companies/${id}`, payload),
  archive: (id, archived) => api.patch(`/api/companies/${id}/archive`, { archived }),
  listContacts: (id) => api.get(`/api/companies/${id}/contacts`),
  createContact: (id, payload) => api.post(`/api/companies/${id}/contacts`, payload),
  updateContact: (id, contactId, payload) =>
    api.patch(`/api/companies/${id}/contacts/${contactId}`, payload),
  archiveContact: (id, contactId, archived) =>
    api.patch(`/api/companies/${id}/contacts/${contactId}/archive`, { archived }),
  makePrimary: (id, contactId) =>
    api.post(`/api/companies/${id}/contacts/${contactId}/make-primary`),
};

import api from './api'; // افترضنا وجود axios/api instance معتمد في المشروع

export const sponsorshipService = {
  // جلب كافة حالات الكفالة
  getCases: async (params = {}) => {
    const response = await api.get('/sponsorships/cases', { params });
    return response.data;
  },

  // تفاصيل حالة كفالة واحدة
  getCaseById: async (id) => {
    const response = await api.get(`/sponsorships/cases/${id}`);
    return response.data;
  },

  // إنشاء حالة كفالة جديدة
  createCase: async (data) => {
    const response = await api.post('/sponsorships/cases', data);
    return response.data;
  },

  // تحديث حالة المراحل (DRAFT -> PROPOSED -> etc.)
  updateStatus: async (id, status) => {
    const response = await api.patch(`/sponsorships/cases/${id}/status`, { status });
    return response.data;
  },

  // جلب وتحديث المكونات الفرعية (التفاعلات، المهام، التعيينات)
  getInteractions: async (caseId) => {
    const response = await api.get(`/sponsorships/cases/${caseId}/interactions`);
    return response.data;
  },

  addInteraction: async (caseId, data) => {
    const response = await api.post(`/sponsorships/cases/${caseId}/interactions`, data);
    return response.data;
  },

  getFollowups: async (caseId) => {
    const response = await api.get(`/sponsorships/cases/${caseId}/followups`);
    return response.data;
  },

  addFollowup: async (caseId, data) => {
    const response = await api.post(`/sponsorships/cases/${caseId}/followups`, data);
    return response.data;
  },

  toggleFollowup: async (followupId) => {
    const response = await api.patch(`/sponsorships/followups/${followupId}/toggle`);
    return response.data;
  },
};

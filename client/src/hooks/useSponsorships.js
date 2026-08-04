import { useState, useEffect, useCallback } from 'react';
import { sponsorshipService } from '../services/sponsorshipService';

export function useSponsorships(filters = {}) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sponsorshipService.getCases(filters);
      setCases(data.data || data);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const updateCaseStatus = async (id, newStatus) => {
    try {
      const updated = await sponsorshipService.updateStatus(id, newStatus);
      setCases((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
      return updated;
    } catch (err) {
      throw err;
    }
  };

  return { cases, loading, error, refresh: fetchCases, updateCaseStatus };
}

import api from './client';

// 401 interceptor: clear auth state + redirect to /login without loops.
// Mounted once at app root so every request shares the same interceptor.
// Returns an eject function so useEffect cleanup can remove the old interceptor
// before mounting a new one, preventing stack accumulation.
export function mount401Interceptor(navigate, clearAuth) {
  const id = api.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401 && !(err.config && err.config._skipRedirect)) {
        clearAuth();
        // Avoid redirect loop: don't redirect if already on a public route.
        const path = location.pathname;
        if (path !== '/login' && path !== '/change-password' && path !== '/unauthorized') {
          navigate('/login');
        }
      }
      return Promise.reject(err);
    },
  );
  return () => api.interceptors.response.eject(id);
}

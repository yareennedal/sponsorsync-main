import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../../api';
import AuthContext from './authContext';

const SESSION_HINT_KEY = 'ss_has_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.me({ _skipRedirect: true });
      setUser(res.data.data.user);
      localStorage.setItem(SESSION_HINT_KEY, 'true');
      return res.data.data.user;
    } catch {
      setUser(null);
      localStorage.removeItem(SESSION_HINT_KEY);
      return null;
    }
  }, []);

  // Initialize auth on mount: call /auth/me ONLY if a session hint exists in localStorage.
  // This prevents unauthenticated public visits (e.g. /login) from triggering a failing
  // 401 network request in DevTools console.
  useEffect(() => {
    const controller = new AbortController();
    const hasSessionHint = localStorage.getItem(SESSION_HINT_KEY) === 'true';

    if (!hasSessionHint) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await authApi.me({ signal: controller.signal, _skipRedirect: true });
        if (!controller.signal.aborted) {
          setUser(res.data.data.user);
          localStorage.setItem(SESSION_HINT_KEY, 'true');
        }
      } catch {
        if (!controller.signal.aborted) {
          setUser(null);
          localStorage.removeItem(SESSION_HINT_KEY);
        }
      }
      if (!controller.signal.aborted) setIsLoading(false);
    })();
    return () => controller.abort();
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await authApi.login(credentials);
    setUser(res.data.data.user);
    localStorage.setItem(SESSION_HINT_KEY, 'true');
    return res.data.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout({ _skipRedirect: true });
    } finally {
      setUser(null);
      localStorage.removeItem(SESSION_HINT_KEY);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

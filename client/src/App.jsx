import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useAuth } from './features/auth/useAuth';
import { mount401Interceptor } from './api/interceptor';
import { RequireAuth, RequireRoles } from './routes/guards';
import AppShell from './layouts/AppShell';
import RouteFallback from './components/RouteFallback';

// LoginPage stays eager: it is the entry point for every unauthenticated visit,
// so lazy-loading it would only add a round trip to the most common first paint.
import LoginPage from './pages/LoginPage';

// The rest split per route. Nobody loads the users table on their way to the login form.
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const UsersPage = lazy(() => import('./features/users/UsersPage'));
const EventsPage = lazy(() => import('./features/events/EventsPage'));
const EventFormPage = lazy(() => import('./features/events/EventFormPage'));
const EventDetailPage = lazy(() => import('./features/events/EventDetailPage'));
const CompaniesPage = lazy(() => import('./features/companies/CompaniesPage'));
const CompanyFormPage = lazy(() => import('./features/companies/CompanyFormPage'));
const CompanyDetailPage = lazy(() => import('./features/companies/CompanyDetailPage'));

export default function App() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Mount the 401 interceptor once so expired/invalid sessions clear and
  // redirect to login without loops.  The returned eject function prevents
  // interceptor stacking when navigate/logout change identity.
  useEffect(() => {
    const eject = mount401Interceptor(navigate, () => logout());
    return eject;
  }, [navigate, logout]);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/change-password"
          element={
            <RequireAuth>
              <ChangePasswordPage />
            </RequireAuth>
          }
        />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* A layout route: AppShell mounts ONCE and stays mounted while the child route
            changes underneath it. Wrapping each page in its own <AppShell> unmounted and
            remounted the whole shell on every navigation, which reset its local state —
            the sidebar silently un-collapsed itself — and re-ran the entrance animation. */}
        <Route
          element={
            <RequireAuth>
              <AppShell>
                <Outlet />
              </AppShell>
            </RequireAuth>
          }
        >
          <Route path="/app" element={<DashboardPage />} />
          <Route path="/app/profile" element={<ProfilePage />} />
          <Route
            path="/app/users"
            element={
              <RequireRoles roles={['ADMIN']}>
                <UsersPage />
              </RequireRoles>
            }
          />
          <Route path="/app/events" element={<EventsPage />} />
          <Route
            path="/app/events/new"
            element={
              <RequireRoles roles={['ADMIN', 'LEADER']}>
                <EventFormPage mode="create" />
              </RequireRoles>
            }
          />
          <Route path="/app/events/:eventId" element={<EventDetailPage />} />
          <Route
            path="/app/events/:eventId/edit"
            element={
              <RequireRoles roles={['ADMIN', 'LEADER']}>
                <EventFormPage mode="edit" />
              </RequireRoles>
            }
          />
          <Route path="/app/events/:eventId/packages" element={<EventDetailPage />} />
          <Route path="/app/companies" element={<CompaniesPage />} />
          <Route
            path="/app/companies/new"
            element={
              <RequireRoles roles={['ADMIN', 'LEADER']}>
                <CompanyFormPage mode="create" />
              </RequireRoles>
            }
          />
          <Route path="/app/companies/:companyId" element={<CompanyDetailPage />} />
          <Route
            path="/app/companies/:companyId/edit"
            element={
              <RequireRoles roles={['ADMIN', 'LEADER']}>
                <CompanyFormPage mode="edit" />
              </RequireRoles>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/app" replace />} />
      </Routes>
    </Suspense>
  );
}

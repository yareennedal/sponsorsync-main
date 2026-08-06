import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useAuth } from './features/auth/useAuth';
import { mount401Interceptor } from './api/interceptor';
import { RequireAuth, RequireRoles } from './routes/guards';
import AppShell from './layouts/AppShell';
import RouteFallback from './components/RouteFallback';
import { useTranslation } from 'react-i18next';

// LoginPage stays eager: it is the entry point for every unauthenticated visit
import LoginPage from './pages/LoginPage';

// Language wrapper component to handle RTL/LTR and translation side-effects
function LanguageProviderWrapper({ children }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  return children;
}

// Sponsorships Dashboard Component
const SponsorshipsDashboard = lazy(() => import('./components/SponsorshipsDashboard'));

// Lazy-loaded pages
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

  useEffect(() => {
    const eject = mount401Interceptor(navigate, () => logout());
    return eject;
  }, [navigate, logout]);

  return (
    <LanguageProviderWrapper>
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

          {/* Protected App Routes */}
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
            
            {/* مسار لوحة الكفالات الجديد */}
            <Route path="/app/sponsorships" element={<SponsorshipsDashboard />} />

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
    </LanguageProviderWrapper>
  );
}
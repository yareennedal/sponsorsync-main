import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import RouteFallback from '../components/RouteFallback';

// Wraps a route so only authenticated users reach it. While auth is initializing,
// render a stable loading state instead of briefly showing protected content.
export function RequireAuth({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return <RouteFallback />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  // Every protected route already passes through here, so this is the one choke point that
  // covers a URL typed straight into the address bar. The server enforces it independently.
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return children;
}

// Restricts a route to specific roles. Unauthenticated → login; authenticated
// but unauthorized → /unauthorized (not 404, since they may know the route).
export function RequireRoles({ children, roles }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <RouteFallback />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}

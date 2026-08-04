import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth, RequireRoles } from './guards.jsx';

// vitest runs without globals: true, so RTL cannot register its own afterEach.
afterEach(() => {
  cleanup();
  vi.resetModules();
});

// The guards read auth state through useAuth. Mocking it keeps these tests about the
// routing decision rather than about AuthProvider's network behaviour.
const authState = { user: null, isAuthenticated: false, isLoading: false };
vi.mock('../features/auth/useAuth', () => ({
  useAuth: () => authState,
}));

function setAuth(next) {
  Object.assign(authState, { user: null, isAuthenticated: false, isLoading: false }, next);
}

function renderAt(path, element) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path={path} element={element} />
        <Route path="/login" element={<div>LOGIN</div>} />
        <Route path="/unauthorized" element={<div>UNAUTHORIZED</div>} />
        <Route path="/change-password" element={<div>CHANGE PASSWORD</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('sends an anonymous visitor to the login page', () => {
    setAuth({ isAuthenticated: false });
    renderAt('/app', <RequireAuth>PROTECTED</RequireAuth>);
    expect(screen.getByText('LOGIN')).toBeTruthy();
  });

  it('renders protected content for an authenticated user', () => {
    setAuth({ isAuthenticated: true, user: { role: 'MEMBER', mustChangePassword: false } });
    renderAt('/app', <RequireAuth>PROTECTED</RequireAuth>);
    expect(screen.getByText('PROTECTED')).toBeTruthy();
  });

  // The regression this file exists for: enforcement used to be a single navigate() on the
  // login page, so typing /app straight into the address bar walked past it entirely.
  it('holds a user with a temporary password on the change-password page', () => {
    setAuth({ isAuthenticated: true, user: { role: 'ADMIN', mustChangePassword: true } });
    renderAt('/app', <RequireAuth>PROTECTED</RequireAuth>);
    expect(screen.queryByText('PROTECTED')).toBeNull();
    expect(screen.getByText('CHANGE PASSWORD')).toBeTruthy();
  });
});

describe('RequireRoles', () => {
  it('renders for a permitted role', () => {
    setAuth({ isAuthenticated: true, user: { role: 'ADMIN', mustChangePassword: false } });
    renderAt('/app/users', <RequireRoles roles={['ADMIN']}>ADMIN AREA</RequireRoles>);
    expect(screen.getByText('ADMIN AREA')).toBeTruthy();
  });

  it('sends a non-permitted role to /unauthorized, not into the admin area', () => {
    setAuth({ isAuthenticated: true, user: { role: 'MEMBER', mustChangePassword: false } });
    renderAt('/app/users', <RequireRoles roles={['ADMIN']}>ADMIN AREA</RequireRoles>);
    expect(screen.queryByText('ADMIN AREA')).toBeNull();
    expect(screen.getByText('UNAUTHORIZED')).toBeTruthy();
  });
});

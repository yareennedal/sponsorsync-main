import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import AppShell from './AppShell.jsx';
import AuthContext from '../features/auth/authContext';

const theme = createTheme({ direction: 'rtl' });

// vitest runs without `globals: true`, so @testing-library/react cannot register
// its own afterEach. Without this the DOM accumulates across tests.
afterEach(cleanup);

function renderShell({ role = 'ADMIN', path = '/app' } = {}) {
  const user = { id: 'u1', fullName: 'بشار', email: 'b@example.com', role, isActive: true };
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter
        initialEntries={[path]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthContext.Provider value={{ user, logout: () => {} }}>
          <AppShell>
            <div>محتوى</div>
          </AppShell>
        </AuthContext.Provider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('AppShell navigation accessibility', () => {
  // Regression: nav items used to be <div onClick>, unreachable by keyboard and
  // invisible to assistive tech. They must expose link semantics.
  it('exposes navigation items as named links inside a labelled nav landmark', () => {
    renderShell();
    const navs = screen.getAllByRole('navigation', { name: 'التنقل الرئيسي' });
    expect(navs.length).toBeGreaterThan(0);

    const links = within(navs[0]).getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual(
      expect.arrayContaining([
        'لوحة التحكم',
        'الملف الشخصي',
        'إدارة الفعاليات',
        'إدارة الشركات',
        'إدارة المستخدمين',
      ]),
    );
    // Every link is focusable — an <a href> is, a <div> is not.
    links.forEach((a) => expect(a).toHaveAttribute('href'));
  });

  it('marks only the current route with aria-current="page"', () => {
    renderShell({ path: '/app/users' });
    const nav = screen.getAllByRole('navigation', { name: 'التنقل الرئيسي' })[0];
    const current = within(nav)
      .getAllByRole('link')
      .filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('إدارة المستخدمين');
  });

  it('does not leak the admin-only group to a non-admin', () => {
    renderShell({ role: 'MEMBER' });
    expect(screen.queryByRole('link', { name: 'إدارة المستخدمين' })).toBeNull();
    expect(screen.getAllByRole('link', { name: 'إدارة الفعاليات' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'إدارة الشركات' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'لوحة التحكم' }).length).toBeGreaterThan(0);
  });

  it('gives the drawer trigger and collapse toggle accessible names', () => {
    renderShell();
    expect(screen.getByRole('button', { name: 'فتح قائمة التنقل' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'طي قائمة التنقل' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'قائمة الحساب' })).toBeInTheDocument();
  });
});

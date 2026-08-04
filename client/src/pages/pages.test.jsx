import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import DashboardPage from './DashboardPage.jsx';
import ChangePasswordPage from './ChangePasswordPage.jsx';
import UnauthorizedPage from './UnauthorizedPage.jsx';
import AuthContext from '../features/auth/authContext';

// These three pages sit behind authentication, so they cannot be driven from a
// browser without entering a password. This is the standing check that they
// mount and render their real content instead.
const theme = createTheme({
  direction: 'rtl',
  shape: { borderRadius: 10 },
  palette: { primary: { main: '#9f1e42', contrastText: '#fff' } },
});

// vitest runs without `globals: true`, so RTL cannot register its own afterEach.
afterEach(cleanup);

function renderPage(ui, { role = 'MEMBER' } = {}) {
  const user = { id: 'u1', fullName: 'بشار', email: 'b@example.com', role, isActive: true };
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthContext.Provider value={{ user, isAuthenticated: true, logout: () => {} }}>
          {ui}
        </AuthContext.Provider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('DashboardPage', () => {
  it('renders the greeting as the page heading', () => {
    renderPage(<DashboardPage />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('أهلاً بك');
    expect(h1).toHaveTextContent('بشار');
  });

  // The user-count card was seeded with { total: 1 } and only refetched for an ADMIN, so
  // every non-admin read "إجمالي المستخدمين: 1" as a system-wide figure. Showing nothing
  // is correct: the endpoint behind it is ADMIN-gated server-side.
  it('shows no user-count card to a non-admin', () => {
    renderPage(<DashboardPage />, { role: 'MEMBER' });
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText('إجمالي المستخدمين')).toBeNull();
  });

  // safeUser deliberately never returns tokenVersion, so this card always read "v0".
  it('does not render a session-version card', () => {
    renderPage(<DashboardPage />);
    expect(screen.queryByText(/^v\d+$/)).toBeNull();
    expect(screen.queryByText('حماية الجلسة')).toBeNull();
  });

  // In MUI v6 the default Grid export is still the LEGACY API (item + xs/sm/md); only Grid2
  // reads size={{...}}. Passing size to the legacy Grid is silently ignored — no error, no
  // warning, clean build — and every column loses its width, collapsing the layout. This
  // shipped once. Asserting a real computed flex-basis catches the wrong import directly:
  // legacy yields "", Grid2 yields a value.
  it('lays its cards out in a real grid (Grid2, not the legacy Grid)', () => {
    const { container } = renderPage(<DashboardPage />);
    const gridItems = container.querySelectorAll('.MuiGrid2-root:not(.MuiGrid2-container)');
    expect(gridItems.length).toBeGreaterThan(0);
    for (const item of gridItems) {
      expect(window.getComputedStyle(item).flexBasis).not.toBe('');
    }
  });
});

describe('ChangePasswordPage', () => {
  it('renders all three password fields', () => {
    renderPage(<ChangePasswordPage />);
    const inputs = document.querySelectorAll('input[type="password"], input[type="text"]');
    expect(inputs.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole('button', { name: /تحديث|حفظ|تغيير/ })).toBeInTheDocument();
  });
});

describe('UnauthorizedPage', () => {
  it('explains the problem and offers a way out', () => {
    renderPage(<UnauthorizedPage />);
    expect(screen.getByText(/غير مصرح/)).toBeInTheDocument();
    // queryAllByRole, not getAllByRole: the latter throws on zero matches, and
    // which of link/button renders depends on whether a session exists.
    const exits = [...screen.queryAllByRole('link'), ...screen.queryAllByRole('button')];
    expect(exits.length).toBeGreaterThan(0);
  });
});

// Guards the Milestone 7 regression: numeric `borderRadius` in sx is a MULTIPLE of
// theme.shape.borderRadius, so raising the theme value silently inflated every
// override (a 10px button became 25px). Nothing outside the theme may set one.
describe('shape consistency', () => {
  it('no page hard-codes a border radius', async () => {
    const modules = import.meta.glob('./*.jsx', { query: '?raw', import: 'default', eager: true });
    const offenders = Object.entries(modules)
      .filter(([name]) => !name.endsWith('.test.jsx'))
      .flatMap(([name, src]) =>
        [...String(src).matchAll(/borderRadius: (?!'50%')([^,\n]+)/g)].map(
          (m) => `${name}: ${m[1]}`,
        ),
      );
    expect(offenders).toEqual([]);
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material';
import App from './App.jsx';
import { AuthProvider } from './features/auth/AuthContext.jsx';

const theme = createTheme({ palette: { mode: 'light' } });

function renderApp() {
  return render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

// vitest runs without globals: true, so @testing-library/react cannot register its own
// afterEach. Without this, a second test in this file mounts a second <App> and every
// query fails with "found multiple elements".
afterEach(cleanup);

describe('App', () => {
  it('renders a usable login form after auth init', async () => {
    renderApp();
    // AuthProvider skips /api/auth/me when the ss_has_session hint is absent, so the
    // loading gate clears immediately and the login route renders.
    // Assert the form is actually operable — the previous version passed as long as the
    // word "SponsorSync" appeared anywhere, including with every input deleted.
    // Anchored: MUI appends a hidden "*" to required labels, so an exact string never
    // matches; and an unanchored /كلمة المرور/ also hits the visibility toggle's aria-label.
    await waitFor(() => {
      expect(screen.getByLabelText(/^البريد الإلكتروني/)).toBeTruthy();
    });
    expect(screen.getByLabelText(/^كلمة المرور/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /تسجيل الدخول/ })).toBeTruthy();
  });
});

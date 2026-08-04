import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';

// The page's only dependency is the API client, so mocking it keeps these tests about the
// component rather than about axios.
const list = vi.fn();
vi.mock('../../api', () => ({
  userApi: {
    list: (...args) => list(...args),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

const UsersPage = (await import('./UsersPage.jsx')).default;

const theme = createTheme({ direction: 'rtl', shape: { borderRadius: 10 } });

// vitest runs without globals: true, so RTL cannot register its own afterEach.
afterEach(cleanup);

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <UsersPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('UsersPage', () => {
  beforeEach(() => {
    list.mockReset();
    list.mockResolvedValue({
      data: {
        data: [
          {
            id: 'u1',
            fullName: 'بشار',
            email: 'b@example.com',
            role: 'ADMIN',
            isActive: true,
            createdAt: '2026-07-01T10:00:00Z',
          },
        ],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    });
  });

  it('renders the fetched rows', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('b@example.com')).toBeInTheDocument());
  });

  // The initial pageSize is 20, matching the server default, but MUI's default
  // rowsPerPageOptions are [10, 25, 50, 100]. Without an explicit list, 20 is out of range:
  // the select renders blank and MUI logs a console error on every mount.
  it('does not log an out-of-range pagination warning', async () => {
    // MUI emits this through console.warn (SelectInput.js), not console.error.
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderPage();
    await waitFor(() => expect(screen.getByText('b@example.com')).toBeInTheDocument());

    const complaints = spy.mock.calls
      .flat()
      .filter((arg) => typeof arg === 'string' && /out-of-range/i.test(arg));
    spy.mockRestore();
    expect(complaints).toEqual([]);
  });

  it('sends the blank filters the server is known to accept', async () => {
    renderPage();
    await waitFor(() => expect(list).toHaveBeenCalled());
    // Regression guard for the bug that made this page 400 on every load: the client sends
    // every filter on every request, so unset ones arrive as ''. The server's Zod schema
    // treats blank as absent. Changing these defaults to null/'all' would break it again.
    expect(list).toHaveBeenCalledWith({
      search: '',
      role: '',
      status: '',
      page: 1,
      pageSize: 20,
    });
  });
});

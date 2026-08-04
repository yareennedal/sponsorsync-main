import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import AuthContext from '../auth/authContext';

const list = vi.fn();
vi.mock('../../api', () => ({
  eventApi: {
    list: (...args) => list(...args),
  },
}));

const EventsPage = (await import('./EventsPage.jsx')).default;
const theme = createTheme({ direction: 'rtl', shape: { borderRadius: 10 } });

afterEach(cleanup);

function renderPage({ role = 'ADMIN' } = {}) {
  const user = {
    id: 'leader-1',
    fullName: 'بشار',
    email: 'leader@example.com',
    role,
    isActive: true,
  };
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthContext.Provider value={{ user, isAuthenticated: true, logout: () => {} }}>
          <EventsPage />
        </AuthContext.Provider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('EventsPage', () => {
  beforeEach(() => {
    list.mockReset();
    list.mockResolvedValue({
      data: {
        data: [
          {
            id: 'event-1',
            name: 'Tech Expo',
            category: 'Technology',
            eventDate: '2026-09-10',
            financialTarget: '5000.00',
            status: 'ACTIVE',
            leader: { id: 'leader-1', fullName: 'قائد الفعالية', role: 'LEADER' },
          },
        ],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    });
  });

  it('renders fetched events', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Tech Expo')).toBeInTheDocument());
    expect(screen.getByText('تقنية')).toBeInTheDocument();
    expect(screen.getByText('قائد الفعالية')).toBeInTheDocument();
  });

  it('sends blank-compatible event filters', async () => {
    renderPage();
    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(list).toHaveBeenCalledWith({
      search: '',
      status: '',
      fromDate: '',
      toDate: '',
      page: 1,
      pageSize: 20,
    });
  });

  it('hides event creation from members', async () => {
    renderPage({ role: 'MEMBER' });
    await waitFor(() => expect(screen.getByText('Tech Expo')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: 'فعالية جديدة' })).toBeNull();
  });
});

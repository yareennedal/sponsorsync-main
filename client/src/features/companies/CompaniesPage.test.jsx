import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import AuthContext from '../auth/authContext';

const list = vi.fn();
vi.mock('../../api', () => ({
  companyApi: {
    list: (...args) => list(...args),
  },
}));

const CompaniesPage = (await import('./CompaniesPage.jsx')).default;
const theme = createTheme({ direction: 'rtl', shape: { borderRadius: 10 } });

afterEach(cleanup);

function renderPage({ role = 'LEADER' } = {}) {
  const user = {
    id: 'user-1',
    fullName: 'بشار',
    email: 'leader@example.com',
    role,
    isActive: true,
  };
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthContext.Provider value={{ user, isAuthenticated: true, logout: () => {} }}>
          <CompaniesPage />
        </AuthContext.Provider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('CompaniesPage', () => {
  beforeEach(() => {
    list.mockReset();
    list.mockResolvedValue({
      data: {
        data: [
          {
            id: 'company-1',
            name: 'Jordan Telecom',
            sector: 'Technology',
            city: 'Amman',
            websiteDomain: 'jordan.example',
            primaryContact: { fullName: 'Lina Sponsor', email: 'lina@jordan.example' },
            archivedAt: null,
          },
        ],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    });
  });

  it('renders fetched companies with primary contact summary', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Jordan Telecom')).toBeInTheDocument());
    expect(screen.getByText('Lina Sponsor')).toBeInTheDocument();
    expect(screen.getByText('jordan.example')).toBeInTheDocument();
  });

  it('sends blank-compatible company filters', async () => {
    renderPage();
    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(list).toHaveBeenCalledWith({
      search: '',
      sector: '',
      city: '',
      archived: false,
      page: 1,
      pageSize: 20,
    });
  });

  it('hides company creation from supervisors', async () => {
    renderPage({ role: 'SUPERVISOR' });
    await waitFor(() => expect(screen.getByText('Jordan Telecom')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: 'شركة جديدة' })).toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import AuthContext from '../auth/authContext';

const get = vi.fn();
const listPackages = vi.fn();
const memberCandidates = vi.fn();
const addMember = vi.fn();
const removeMember = vi.fn();
const updateStatus = vi.fn();
const createPackage = vi.fn();
const updatePackage = vi.fn();
const deactivatePackage = vi.fn();

vi.mock('../../api', () => ({
  eventApi: {
    get: (...args) => get(...args),
    listPackages: (...args) => listPackages(...args),
    memberCandidates: (...args) => memberCandidates(...args),
    addMember: (...args) => addMember(...args),
    removeMember: (...args) => removeMember(...args),
    updateStatus: (...args) => updateStatus(...args),
    createPackage: (...args) => createPackage(...args),
    updatePackage: (...args) => updatePackage(...args),
    deactivatePackage: (...args) => deactivatePackage(...args),
  },
}));

const EventDetailPage = (await import('./EventDetailPage.jsx')).default;
const theme = createTheme({ direction: 'rtl', shape: { borderRadius: 10 } });

afterEach(cleanup);

function eventFixture() {
  return {
    id: 'event-1',
    name: 'Tech Expo',
    description: null,
    category: 'Technology',
    eventDate: '2026-09-10',
    location: 'Amman',
    financialTarget: '5000.00',
    sponsorshipDeadline: '2026-09-01',
    targetSectors: ['Technology'],
    targetCities: ['Amman'],
    status: 'ACTIVE',
    leaderId: 'leader-1',
    leader: { id: 'leader-1', fullName: 'قائد الفعالية', role: 'LEADER' },
    members: [],
    permissions: {
      canRead: true,
      canEdit: true,
      canManageMembers: true,
      canManagePackages: true,
      canChangeStatus: true,
    },
  };
}

function renderPage() {
  const user = {
    id: 'leader-1',
    fullName: 'بشار',
    email: 'leader@example.com',
    role: 'LEADER',
    isActive: true,
  };
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter
        initialEntries={['/app/events/event-1']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthContext.Provider value={{ user, isAuthenticated: true, logout: () => {} }}>
          <Routes>
            <Route path="/app/events/:eventId" element={<EventDetailPage />} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('EventDetailPage', () => {
  beforeEach(() => {
    get.mockReset();
    listPackages.mockReset();
    memberCandidates.mockReset();
    addMember.mockReset();
    removeMember.mockReset();
    updateStatus.mockReset();
    createPackage.mockReset();
    updatePackage.mockReset();
    deactivatePackage.mockReset();

    get.mockResolvedValue({ data: { data: eventFixture() } });
    listPackages.mockResolvedValue({ data: { data: [] } });
    memberCandidates.mockResolvedValue({
      data: {
        data: [
          {
            id: 'candidate-1',
            fullName: 'مرشح الفريق',
            email: 'candidate@example.com',
            role: 'MEMBER',
            membershipStatus: 'INACTIVE',
          },
        ],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    });
    addMember.mockResolvedValue({ data: { data: {} } });
  });

  it('uses event-scoped candidates for member management', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('مرشح الفريق')).toBeInTheDocument());
    expect(memberCandidates).toHaveBeenCalledWith('event-1', {
      search: '',
      role: '',
      page: 1,
      pageSize: 20,
    });
    expect(screen.getByText('إعادة تفعيل')).toBeInTheDocument();
    expect(screen.queryByLabelText(/UUID|userId|معرّف|معرف/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^إضافة$/ }));
    await waitFor(() => expect(addMember).toHaveBeenCalledWith('event-1', 'candidate-1'));
  });
});

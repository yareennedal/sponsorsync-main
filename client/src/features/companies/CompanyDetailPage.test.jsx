import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import AuthContext from '../auth/authContext';

const get = vi.fn();
const listContacts = vi.fn();
const createContact = vi.fn();
const updateContact = vi.fn();
const archiveContact = vi.fn();
const makePrimary = vi.fn();
const archive = vi.fn();

vi.mock('../../api', () => ({
  companyApi: {
    get: (...args) => get(...args),
    archive: (...args) => archive(...args),
    listContacts: (...args) => listContacts(...args),
    createContact: (...args) => createContact(...args),
    updateContact: (...args) => updateContact(...args),
    archiveContact: (...args) => archiveContact(...args),
    makePrimary: (...args) => makePrimary(...args),
  },
}));

const CompanyDetailPage = (await import('./CompanyDetailPage.jsx')).default;
const theme = createTheme({ direction: 'rtl', shape: { borderRadius: 10 } });

afterEach(cleanup);

function companyFixture(
  permissions = { canEdit: true, canArchive: true, canRestore: false, canManageContacts: true },
) {
  return {
    id: 'company-1',
    name: 'Jordan Telecom',
    sector: 'Technology',
    city: 'Amman',
    websiteDomain: 'jordan.example',
    generalEmail: 'info@jordan.example',
    primaryContact: {
      id: 'contact-1',
      fullName: 'Primary Contact',
      email: 'primary@jordan.example',
      isPrimary: true,
    },
    contacts: [
      {
        id: 'contact-1',
        fullName: 'Primary Contact',
        email: 'primary@jordan.example',
        preferredContactMethod: 'EMAIL',
        isPrimary: true,
      },
      {
        id: 'contact-2',
        fullName: 'Second Contact',
        phone: '+962797654321',
        preferredContactMethod: 'WHATSAPP',
        isPrimary: false,
      },
    ],
    sponsorshipHistory: { status: 'UNAVAILABLE', items: [] },
    permissions,
  };
}

function renderPage({ role = 'LEADER', permissions } = {}) {
  const user = {
    id: 'user-1',
    fullName: 'بشار',
    email: 'leader@example.com',
    role,
    isActive: true,
  };
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter
        initialEntries={['/app/companies/company-1']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthContext.Provider value={{ user, isAuthenticated: true, logout: () => {} }}>
          <Routes>
            <Route
              path="/app/companies/:companyId"
              element={<CompanyDetailPage permissionsOverride={permissions} />}
            />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('CompanyDetailPage', () => {
  beforeEach(() => {
    get.mockReset();
    listContacts.mockReset();
    createContact.mockReset();
    updateContact.mockReset();
    archiveContact.mockReset();
    makePrimary.mockReset();
    archive.mockReset();
    get.permissions = undefined;

    get.mockImplementation(() => {
      const permissions = get.permissions ?? {
        canEdit: true,
        canArchive: true,
        canRestore: false,
        canManageContacts: true,
      };
      return Promise.resolve({ data: { data: companyFixture(permissions) } });
    });
    listContacts.mockResolvedValue({ data: { data: companyFixture().contacts } });
    makePrimary.mockResolvedValue({ data: { data: { id: 'contact-2', isPrimary: true } } });
    archive.mockResolvedValue({ data: { data: companyFixture() } });
  });

  it('renders contacts, sponsorship-history placeholder, and makes a contact primary', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Jordan Telecom')).toBeInTheDocument());
    expect(screen.getByText('Second Contact')).toBeInTheDocument();
    expect(screen.getByText(/سجل الرعاية سيظهر هنا/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'تعيين Second Contact كجهة أساسية' }));
    await waitFor(() => expect(makePrimary).toHaveBeenCalledWith('company-1', 'contact-2'));
  });

  it('hides contact write controls for read-only company permissions', async () => {
    get.permissions = {
      canEdit: false,
      canArchive: false,
      canRestore: false,
      canManageContacts: false,
    };
    renderPage({ role: 'SUPERVISOR' });

    await waitFor(() => expect(screen.getByText('Jordan Telecom')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'إضافة جهة تواصل' })).toBeNull();
    expect(screen.queryByRole('button', { name: /تعيين .* كجهة أساسية/ })).toBeNull();
    get.permissions = undefined;
  });

  it('archives the company when the user has archive permission', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();

    await waitFor(() => expect(screen.getByText('Jordan Telecom')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'أرشفة' }));

    await waitFor(() => expect(archive).toHaveBeenCalledWith('company-1', true));
    confirm.mockRestore();
  });
});

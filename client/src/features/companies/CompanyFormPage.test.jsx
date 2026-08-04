import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import AuthContext from '../auth/authContext';

const create = vi.fn();
const duplicates = vi.fn();
const get = vi.fn();
const update = vi.fn();

vi.mock('../../api', () => ({
  companyApi: {
    create: (...args) => create(...args),
    duplicates: (...args) => duplicates(...args),
    get: (...args) => get(...args),
    update: (...args) => update(...args),
  },
}));

const CompanyFormPage = (await import('./CompanyFormPage.jsx')).default;
const theme = createTheme({ direction: 'rtl', shape: { borderRadius: 10 } });

afterEach(cleanup);

function duplicateError() {
  return {
    response: {
      data: {
        error: {
          code: 'COMPANY_DUPLICATE_HIGH_CONFIDENCE',
          message: 'توجد شركة مشابهة بدرجة عالية.',
          details: {
            matches: [
              {
                companyId: 'company-existing',
                name: 'Jordan Telecom Existing',
                confidence: 'HIGH',
                reasons: ['same website domain'],
              },
            ],
          },
        },
      },
    },
  };
}

function renderPage({ mode = 'create', companyId = 'company-current' } = {}) {
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
        initialEntries={[
          mode === 'edit' ? `/app/companies/${companyId}/edit` : '/app/companies/new',
        ]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthContext.Provider value={{ user, isAuthenticated: true, logout: () => {} }}>
          <Routes>
            <Route path="/app/companies/new" element={<CompanyFormPage mode="create" />} />
            <Route
              path="/app/companies/:companyId/edit"
              element={<CompanyFormPage mode="edit" />}
            />
            <Route path="/app/companies/:companyId" element={<div>تفاصيل الشركة</div>} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('CompanyFormPage', () => {
  beforeEach(() => {
    create.mockReset();
    duplicates.mockReset();
    get.mockReset();
    update.mockReset();

    duplicates.mockResolvedValue({
      data: {
        data: [
          {
            companyId: 'company-existing',
            name: 'Jordan Telecom Existing',
            confidence: 'HIGH',
            reasons: ['same website domain'],
          },
        ],
      },
    });
    create.mockRejectedValueOnce(duplicateError()).mockResolvedValueOnce({
      data: { data: { id: 'company-new', name: 'Jordan Telecom' } },
    });
  });

  it('shows duplicate suggestions and preserves backend conflict details for override retry', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/^اسم الشركة/), {
      target: { value: 'Jordan Telecom' },
    });
    fireEvent.change(screen.getByLabelText(/^الموقع الإلكتروني/), {
      target: { value: 'https://jordan.example' },
    });

    await waitFor(() =>
      expect(duplicates).toHaveBeenCalledWith({
        name: 'Jordan Telecom',
        website: 'https://jordan.example',
        generalEmail: '',
        phone: '',
        city: '',
      }),
    );
    expect(screen.getByText('Jordan Telecom Existing')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'إنشاء الشركة' }));

    await waitFor(() =>
      expect(screen.getByText('توجد شركة مشابهة بدرجة عالية.')).toBeInTheDocument(),
    );
    expect(screen.getByText('same website domain')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^سبب التجاوز/), {
      target: { value: 'فرع قانوني مستقل' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء الشركة' }));

    await waitFor(() =>
      expect(create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          name: 'Jordan Telecom',
          website: 'https://jordan.example',
          overrideReason: 'فرع قانوني مستقل',
        }),
      ),
    );
  });

  it('excludes the current company from edit-mode duplicate suggestions', async () => {
    get.mockResolvedValueOnce({
      data: {
        data: {
          id: 'company-current',
          name: 'Jordan Telecom',
          sector: 'Technology',
          city: 'Amman',
          website: 'https://jordan.example',
          generalEmail: '',
          phone: '',
          address: '',
          notes: '',
        },
      },
    });

    renderPage({ mode: 'edit', companyId: 'company-current' });

    await waitFor(() =>
      expect(duplicates).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jordan Telecom',
          website: 'https://jordan.example',
          city: 'Amman',
          excludeCompanyId: 'company-current',
        }),
      ),
    );
  });
});

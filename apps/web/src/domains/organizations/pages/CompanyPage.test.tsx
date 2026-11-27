import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CompanyPage from './CompanyPage';
import * as api from '../api';

vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      companies: [{ id: 'company-1' }],
    },
    activeCompanyId: 'company-1',
    setActiveCompany: vi.fn(),
  }),
}));
vi.mock('@/app/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/shared/components/ui/help-tooltip', () => ({
  HelpTooltip: () => null,
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof api>('../api');
  return {
    ...actual,
    getCompany: vi.fn(),
    updateCompanyProfile: vi.fn(),
    listInvitations: vi.fn(),
  };
});

const mockedApi = vi.mocked(api);

describe('Organization profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getCompany.mockResolvedValue({
      company: {
        id: 'company-1',
        name: 'Neural Works OÜ',
        registrationNumber: '12345678',
        country: 'Estonia',
        aiActRole: 'PROVIDER',
      },
      members: [
        {
          id: 'admin-1',
          email: 'admin@example.com',
          role: 'ADMIN',
          createdAt: '2026-10-31T12:00:00.000Z',
        },
      ],
    } as never);
    mockedApi.listInvitations.mockResolvedValue([] as never);
    mockedApi.updateCompanyProfile.mockResolvedValue({} as never);
  });

  it('loads, edits, and saves all four required organization fields', async () => {
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <MemoryRouter>
          <CompanyPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByLabelText(/Organization name/)).toHaveValue(
      'Neural Works OÜ',
    );
    expect(screen.getByLabelText(/Registration number/)).toHaveValue(
      '12345678',
    );
    expect(screen.getByLabelText(/Country/)).toHaveValue('Estonia');
    expect(screen.getByLabelText('EU AI Act role')).toHaveValue('provider');

    fireEvent.change(screen.getByLabelText(/Organization name/), {
      target: { value: 'Updated Neural Works' },
    });
    fireEvent.change(screen.getByLabelText(/Registration number/), {
      target: { value: '87654321' },
    });
    fireEvent.change(screen.getByLabelText(/Country/), {
      target: { value: 'Finland' },
    });
    fireEvent.change(screen.getByLabelText('EU AI Act role'), {
      target: { value: 'deployer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() =>
      expect(mockedApi.updateCompanyProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationName: 'Updated Neural Works',
          registrationNumber: '87654321',
          country: 'Finland',
          role: 'deployer',
        }),
      ),
    );
  });
});

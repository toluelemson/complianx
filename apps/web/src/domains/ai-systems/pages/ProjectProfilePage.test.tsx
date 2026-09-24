import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import ProjectProfilePage from './ProjectProfilePage';
import {
  getOrganizationProfile,
  updateOrganizationProfile,
  updateProject,
} from '../api';

vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    token: 'test-token',
    activeCompanyId: 'company',
    initializing: false,
  }),
}));
vi.mock('@/app/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../api', () => ({
  getProject: vi.fn().mockResolvedValue({ name: 'Project' }),
  getOrganizationProfile: vi.fn(),
  updateOrganizationProfile: vi.fn(),
  updateProject: vi.fn(),
}));

function showPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // The company page caches a different response shape under this parent key.
  client.setQueryData(['company', 'company'], {
    company: { legalName: 'Wrong shape' },
    members: [],
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/projects/project/organization-profile']}>
        <Routes>
          <Route
            path="/projects/:projectId/:profileKey"
            element={<ProjectProfilePage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getOrganizationProfile).mockResolvedValue({
    legalName: 'Saved company',
    website: '',
    contactEmail: '',
  });
  vi.mocked(updateOrganizationProfile).mockResolvedValue({});
  vi.mocked(updateProject).mockResolvedValue({} as never);
});

describe('Organization profile', () => {
  it('loads saved values independently of the company page cache and saves blank optional fields', async () => {
    showPage();
    expect(
      await screen.findByRole('textbox', { name: 'Legal name' }),
    ).toHaveValue('Saved company');
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() =>
      expect(updateOrganizationProfile).toHaveBeenCalledWith({
        legalName: 'Saved company',
        website: '',
        industry: '',
        address: '',
        contactEmail: '',
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Profile saved.',
    );
  });

  it('shows server validation errors, retains edits, and permits a corrected retry', async () => {
    const error = new AxiosError('Bad Request');
    error.response = {
      data: { message: ['contactEmail must be an email'] },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: {} },
    } as typeof error.response;
    vi.mocked(updateOrganizationProfile)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({});
    showPage();
    const email = await screen.findByRole('textbox', { name: 'Contact email' });
    fireEvent.change(email, { target: { value: 'Contact email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'contactEmail must be an email',
    );
    expect(email).toHaveValue('Contact email');
    fireEvent.change(email, { target: { value: 'contact@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Profile saved.',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('offers retry when loading fails', async () => {
    vi.mocked(getOrganizationProfile).mockRejectedValueOnce(
      new Error('offline'),
    );
    showPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load profile.',
    );
    expect(
      screen.queryByRole('button', { name: 'Save profile' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(
      await screen.findByRole('textbox', { name: 'Legal name' }),
    ).toHaveValue('Saved company');
  });
});

describe('AI system profile', () => {
  it('saves clear system details to the current project', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/projects/project/ai-system-profile']}>
          <Routes>
            <Route
              path="/projects/:projectId/:profileKey"
              element={<ProjectProfilePage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const purpose = await screen.findByRole('textbox', {
      name: 'What it does',
    });
    fireEvent.change(purpose, {
      target: { value: 'Summarises customer-support calls for an agent.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() =>
      expect(updateProject).toHaveBeenCalledWith(
        'project',
        expect.objectContaining({
          name: 'Project',
          intendedUse: 'Summarises customer-support calls for an agent.',
        }),
      ),
    );
  });
});

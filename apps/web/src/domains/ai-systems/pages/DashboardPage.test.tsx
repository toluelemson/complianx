import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './DashboardPage';
import * as aiSystemsApi from '../api';

vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    token: 'test-token',
    initializing: false,
    activeCompanyId: 'company-1',
  }),
}));

vi.mock('@/app/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/NewProjectModal', () => ({
  NewProjectModal: (props: {
    isOpen: boolean;
    onSubmit: (values: { name: string }) => void;
  }) =>
    props.isOpen ? (
      <button type="button" onClick={() => props.onSubmit({ name: 'System' })}>
        Submit system
      </button>
    ) : null,
}));

vi.mock('../components/CloneProjectModal', () => ({
  CloneProjectModal: () => null,
}));

vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof aiSystemsApi>('../api');
  return {
    ...actual,
    listProjects: vi.fn(),
    getOrganizationProfile: vi.fn(),
    createProject: vi.fn(),
    classifyProjectIntake: vi.fn(),
  };
});

const mockedApi = vi.mocked(aiSystemsApi);

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.listProjects.mockResolvedValue([]);
  mockedApi.getOrganizationProfile.mockResolvedValue({} as never);
  mockedApi.createProject.mockResolvedValue({ id: 'new-system' } as never);
});

describe('AI system onboarding entry', () => {
  it('shows a concise first-time path and opens registration from it', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Your first 30 minutes')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Explore a fictional example' }),
    ).toHaveAttribute('href', '/demo/loan-approval-ai');
    fireEvent.click(
      screen.getByRole('button', { name: 'Add your first AI system' }),
    );
    expect(screen.getByRole('button', { name: 'Submit system' })).toBeVisible();
  });

  it('opens the full EU AI Act questions after registration', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/projects/:projectId/classification"
              element={<p>EU AI Act questions</p>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Assess an AI system' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Submit system' }));

    expect(await screen.findByText('EU AI Act questions')).toBeVisible();
    expect(mockedApi.createProject).toHaveBeenCalledWith({ name: 'System' });
    expect(mockedApi.classifyProjectIntake).not.toHaveBeenCalled();
  });

  it('takes an incomplete system directly to documentation from next actions', async () => {
    mockedApi.listProjects.mockResolvedValue([
      {
        id: 'system-1',
        name: 'Retail assistant',
        workflowStatus: 'DRAFT',
        sections: [],
        documents: [],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ] as never);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/projects/:projectId/compliance-workspace"
              element={<p>Documentation workspace</p>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const nextAction = await screen.findByRole('link', {
      name: /retail assistant.*continue documentation/i,
    });
    expect(nextAction).toHaveAttribute(
      'href',
      '/projects/system-1/compliance-workspace?companyId=company-1',
    );
  });
});

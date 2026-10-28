import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as aiSystemsApi from '../api';
import ProjectOverviewPage from './ProjectOverviewPage';

vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    token: 'test-token',
    activeCompanyId: 'company-1',
    initializing: false,
  }),
}));
vi.mock('@/app/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../api', () => ({
  getProject: vi.fn(),
  getProjectSections: vi.fn(),
  getProjectDocuments: vi.fn(),
  getPreliminaryClassification: vi.fn(),
  listProjectObligations: vi.fn(),
  listObligationEvidence: vi.fn(),
}));

const mockedApi = vi.mocked(aiSystemsApi);

describe('Project overview availability', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stops dependent requests when the project is unavailable', async () => {
    mockedApi.getProject.mockRejectedValueOnce(new Error('Not found'));

    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <MemoryRouter initialEntries={['/projects/missing/overview']}>
          <Routes>
            <Route
              path="/projects/:projectId/overview"
              element={<ProjectOverviewPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'AI system unavailable' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Return to dashboard' }),
    ).toHaveAttribute('href', '/dashboard');
    await waitFor(() => expect(mockedApi.getProject).toHaveBeenCalledTimes(1));
    expect(mockedApi.getProjectSections).not.toHaveBeenCalled();
    expect(mockedApi.getProjectDocuments).not.toHaveBeenCalled();
    expect(mockedApi.getPreliminaryClassification).not.toHaveBeenCalled();
    expect(mockedApi.listProjectObligations).not.toHaveBeenCalled();
  });
});

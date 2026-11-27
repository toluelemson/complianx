import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getProjectWorkflowSummary } from '../api';
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
vi.mock('../api', () => ({ getProjectWorkflowSummary: vi.fn() }));

function renderOverview() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/projects/project-1/overview']}>
        <Routes>
          <Route
            path="/projects/:projectId/overview"
            element={<ProjectOverviewPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Project workflow overview', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows a retry when it cannot load the summary', async () => {
    vi.mocked(getProjectWorkflowSummary).mockRejectedValue(
      new Error('Unavailable'),
    );
    renderOverview();
    expect(
      await screen.findByRole('heading', {
        name: 'Could not load the workflow',
      }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  it('links directly to the evidence blocker returned by the API', async () => {
    vi.mocked(getProjectWorkflowSummary).mockResolvedValue({
      projectId: 'project-1',
      name: 'Candidate ranking',
      workflowStatus: 'DRAFT',
      completedStages: ['register', 'assess'],
      classificationCategory: 'high_risk',
      applicableRequirements: 1,
      verifiedRequirements: 0,
      blockers: 1,
      waiting: 0,
      outstanding: 1,
      reassessmentReasons: [],
      packageStatus: 'NONE',
      nextAction: {
        stage: 'comply',
        category: 'BLOCKED',
        title: 'Evidence is missing: Keep technical documentation',
        detail: 'Link current supporting evidence for this requirement.',
        actionLabel: 'Upload evidence',
        href: '/projects/project-1/evidence#requirement-requirement-1',
        entityType: 'requirement',
        entityId: 'requirement-1',
        permission: 'OWNER',
      },
    });
    renderOverview();
    expect(
      await screen.findByRole('heading', {
        name: 'Evidence is missing: Keep technical documentation',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Upload evidence →' }),
    ).toHaveAttribute(
      'href',
      '/projects/project-1/evidence#requirement-requirement-1',
    );
  });
});

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectQuestionnairePage from './ProjectQuestionnairePage';
import * as aiSystemsApi from '../api';
import { loadPublicQuestionPack } from '@/domains/regulatory-frameworks/api';

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

vi.mock('@/domains/regulatory-frameworks/api', () => ({
  loadPublicQuestionPack: vi.fn(),
}));

vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof aiSystemsApi>('../api');
  return {
    ...actual,
    getPreliminaryClassification: vi.fn(),
    getProject: vi.fn(),
    listAssessmentAnswers: vi.fn(),
    listProjectObligations: vi.fn(),
    createProjectAssessment: vi.fn(),
  };
});

const mockedApi = vi.mocked(aiSystemsApi);
const mockedLoadPack = vi.mocked(loadPublicQuestionPack);

beforeEach(() => {
  vi.clearAllMocks();
  mockedLoadPack.mockResolvedValue({
    questionPack: {
      key: 'eu-ai-act',
      version: '1.0.0',
      title: 'EU AI Act',
      steps: [],
    },
  } as never);
  mockedApi.getPreliminaryClassification.mockResolvedValue({
    id: 'classification-1',
    assessmentId: 'assessment-1',
    category: 'action_required',
    reviewStatus: 'PENDING',
    regulatoryContentVersion: '2026.1',
    resultSnapshot: {
      high_risk: true,
      operator_roles: ['provider'],
      summary_sentence: 'The answers indicate a likely high-risk use.',
    },
  });
  mockedApi.getProject.mockResolvedValue({
    id: 'project-1',
    name: 'Assessment test',
    viewerRole: 'OWNER',
    sections: [],
    documents: [],
    deploymentGeography: 'European Union',
    operatorRoles: ['provider'],
  } as never);
  mockedApi.listAssessmentAnswers.mockResolvedValue([]);
  mockedApi.listProjectObligations.mockResolvedValue([
    { id: 'one', approvalState: 'DRAFT' },
    { id: 'two', approvalState: 'APPROVED' },
  ] as never);
});

describe('EU AI Act onboarding result', () => {
  it('explains the preliminary result and leads to applicable requirements', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/projects/project-1/classification']}>
          <Routes>
            <Route
              path="/projects/:projectId/classification"
              element={<ProjectQuestionnairePage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText('Here is what likely applies'),
    ).toBeVisible();
    expect(screen.getByText('Provider')).toBeVisible();
    expect(screen.getByText('High-risk')).toBeVisible();
    expect(await screen.findByText('2')).toBeVisible();
    expect(screen.getByText('Human review required')).toBeVisible();
    expect(screen.getByText('Neuraldocx interpretation')).toBeVisible();
    expect(screen.getByText(/not legal advice/i)).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Continue compliance setup' }),
    ).toHaveAttribute('href', '/projects/project-1/requirements');
    expect(mockedApi.createProjectAssessment).not.toHaveBeenCalled();
  });
});

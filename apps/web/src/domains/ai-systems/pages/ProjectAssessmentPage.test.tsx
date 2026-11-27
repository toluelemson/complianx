import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectAssessmentPage from './ProjectAssessmentPage';
import * as api from '../api';

vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    token: 'token',
    initializing: false,
    activeCompanyId: 'company-1',
  }),
}));
vi.mock('@/app/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof api>('../api');
  return {
    ...actual,
    getAssessmentWorkspace: vi.fn(),
    updateAssessmentScoring: vi.fn(),
    createProjectAssessment: vi.fn(),
  };
});

const mockedApi = vi.mocked(api);

describe('Project assessment scoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getAssessmentWorkspace.mockResolvedValue({
      id: 'assessment-1',
      status: 'CLASSIFIED',
      weightingChoice: 'STANDARD',
      targetBand: 'READY',
      versionNumber: 2,
      assessmentDate: '2026-10-31T00:00:00.000Z',
      assessorType: 'SELF_ASSESSMENT',
      assessorName: 'Compliance team',
      coverageScore: null,
      updatedAt: '2026-10-31T12:00:00.000Z',
      packVersion: { id: 'pack-1', key: 'eu-ai-act', version: '2026.10.v3' },
      requirementRows: [
        {
          id: 'row-1',
          obligationId: 'obligation-1',
          requirementId: 'EU-AIA-ART-50-TRANSPARENCY',
          score: null,
          state: 'NOT_STARTED',
          weight: 1,
          rationale: null,
          evidenceLinks: [],
          obligation: {
            id: 'obligation-1',
            status: 'NOT_STARTED',
            obligation: {
              catalogueId: 'EU-AIA-ART-50-TRANSPARENCY',
              title: 'Transparency notice',
              aiActArticle: 'Art. 50',
              trustworthinessPrinciple: 'TRANSPARENCY_AND_LOGGING',
              architectureElements: [
                'User interface notice',
                'Interaction logging',
              ],
              verificationMethod: 'Inspect the user notice',
            },
          },
        },
      ],
      changeLog: [
        {
          id: 'log-1',
          versionNumber: 2,
          action: 'CLASSIFIED',
          snapshot: {},
          createdAt: '2026-10-31T12:00:00.000Z',
        },
      ],
    });
    mockedApi.updateAssessmentScoring.mockResolvedValue({} as never);
  });

  it('saves assessment settings and a requirement scoring row', async () => {
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <MemoryRouter initialEntries={['/projects/project-1/assessment']}>
          <Routes>
            <Route
              path="/projects/:projectId/assessment"
              element={<ProjectAssessmentPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Transparency notice')).toBeVisible();
    expect(screen.getByText('Transparency And Logging')).toBeVisible();
    expect(
      screen.getByText('User interface notice · Interaction logging'),
    ).toBeVisible();
    expect(screen.getByText('Inspect the user notice')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Score for Transparency notice'), {
      target: { value: '86' },
    });
    fireEvent.change(
      screen.getByLabelText('Rationale for Transparency notice'),
      { target: { value: 'Notice reviewed' } },
    );
    fireEvent.change(
      screen.getByLabelText('Evidence links for Transparency notice'),
      { target: { value: 'https://example.com/notice' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save scoring' }));
    await waitFor(() =>
      expect(mockedApi.updateAssessmentScoring).toHaveBeenCalledWith(
        'project-1',
        'assessment-1',
        expect.objectContaining({
          weightingChoice: 'STANDARD',
          targetBand: 'READY',
          rows: [
            expect.objectContaining({
              score: 86,
              rationale: 'Notice reviewed',
              evidenceLinks: ['https://example.com/notice'],
            }),
          ],
        }),
      ),
    );
    expect(screen.getByText(/v2 · classified/)).toBeVisible();
  });
});

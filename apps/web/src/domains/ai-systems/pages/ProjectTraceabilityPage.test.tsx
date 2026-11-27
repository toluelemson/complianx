import '@testing-library/jest-dom/vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectTraceabilityPage from './ProjectTraceabilityPage';
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
    getTraceabilityModel: vi.fn(),
    createSystemAsset: vi.fn(),
    updateSystemAsset: vi.fn(),
    createLifecycleEvent: vi.fn(),
    createComplianceStakeholder: vi.fn(),
    createDocumentationItem: vi.fn(),
    updateAssessmentContext: vi.fn(),
    updateRequirementAssetLinks: vi.fn(),
    createTechnicalMeasure: vi.fn(),
    updateTechnicalMeasure: vi.fn(),
    finalizeAssessment: vi.fn(),
  };
});

const mockedApi = vi.mocked(api);

describe('Project compliance traceability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getTraceabilityModel.mockResolvedValue({
      project: { id: 'project-1', name: 'Hiring assistant' },
      assessment: {
        id: 'assessment-1',
        status: 'CLASSIFIED',
        date: '2026-10-31T00:00:00.000Z',
        assessorType: 'INTERNAL_AUDIT',
        assessorName: 'Compliance team',
        coverageScore: 72.5,
        versionNumber: 3,
        catalogueVersion: '2026.10',
      },
      assets: [
        {
          id: '0c9b13a9-3e4b-47ab-8840-06ed3ad437ae',
          name: 'Candidate ranking model',
          assetType: 'MODEL',
          lifecycleStage: 'PILOT',
          version: '2.1',
        },
      ],
      obligations: [
        {
          id: 'obligation-1',
          obligation: {
            catalogueId: 'EU-AIA-ART-14-HUMAN-OVERSIGHT',
            title: 'Human oversight',
            aiActArticle: 'Art. 14',
            trustworthinessPrinciple: 'HUMAN_OVERSIGHT',
            architectureElements: ['Reviewer console'],
            verificationMethod: 'Test the override procedure',
          },
          assetLinks: [
            {
              systemAsset: {
                id: '0c9b13a9-3e4b-47ab-8840-06ed3ad437ae',
                name: 'Candidate ranking model',
              },
            },
          ],
          technicalMeasures: [
            {
              id: 'measure-1',
              title: 'Human override control',
              status: 'PARTIAL',
            },
          ],
          documentationItems: [],
          evidence: [{ id: 'evidence-1' }],
        },
      ],
      documentationItems: [
        {
          id: 'doc-1',
          title: 'Override test report',
          documentType: 'MONITORING_AND_TESTING',
          systemAsset: {
            id: '0c9b13a9-3e4b-47ab-8840-06ed3ad437ae',
            name: 'Candidate ranking model',
          },
          obligation: {
            id: 'obligation-1',
            obligation: {
              catalogueId: 'EU-AIA-ART-14-HUMAN-OVERSIGHT',
              title: 'Human oversight',
            },
          },
        },
      ],
      lifecycleEvents: [
        {
          id: 'lifecycle-1',
          stage: 'PILOT',
          happenedAt: '2026-10-01T00:00:00.000Z',
          notes: 'Started controlled pilot.',
          createdBy: { id: 'user-1', email: 'owner@example.com' },
          createdAt: '2026-10-01T00:00:00.000Z',
        },
      ],
      stakeholders: [
        {
          id: 'stakeholder-1',
          role: 'PROVIDER',
          name: 'Example Provider',
          registrationNumber: 'REG-1',
          country: 'EE',
          createdBy: { id: 'user-1', email: 'owner@example.com' },
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
        },
      ],
      history: [
        {
          id: 'history-1',
          source: 'AUDIT',
          action: 'LIFECYCLE_STAGE_RECORDED',
          entityType: 'SystemLifecycleEvent',
          entityId: 'lifecycle-1',
          actor: 'owner@example.com',
          createdAt: '2026-10-01T00:00:00.000Z',
        },
      ],
      gaps: [
        {
          id: 'measure-gap',
          severity: 'BLOCKER',
          category: 'ASSESSMENT',
          title: 'Complete a technical measure',
          recommendation: 'Verify and mark the measure complete.',
        },
      ],
      finalization: {
        ready: false,
        blockers: ['Complete a technical measure'],
      },
      reassessment: { required: false, reason: null },
      scope: {
        included: 'Technical documentation and assessment coverage.',
        excluded: 'Definitive legal conclusions require human review.',
      },
    });
    mockedApi.createSystemAsset.mockResolvedValue({} as never);
    mockedApi.updateSystemAsset.mockResolvedValue({} as never);
    mockedApi.createComplianceStakeholder.mockResolvedValue({} as never);
    mockedApi.createLifecycleEvent.mockResolvedValue({} as never);
  });

  it('shows the complete traceability chain and creates an asset', async () => {
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <MemoryRouter initialEntries={['/projects/project-1/traceability']}>
          <Routes>
            <Route
              path="/projects/:projectId/traceability"
              element={<ProjectTraceabilityPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('72.5%')).toBeVisible();
    expect(screen.getAllByText('Candidate ranking model')[0]).toBeVisible();
    expect(
      screen.getAllByText('EU-AIA-ART-14-HUMAN-OVERSIGHT')[0],
    ).toBeVisible();
    expect(screen.getByText('Human Oversight')).toBeVisible();
    expect(screen.getAllByText('Human override control')[0]).toBeVisible();
    expect(screen.getByText('Override test report')).toBeVisible();
    expect(screen.getByText('Example Provider')).toBeVisible();
    expect(screen.getByText('Started controlled pilot.')).toBeVisible();
    expect(screen.getByText('Complete a technical measure')).toBeVisible();
    expect(
      screen.getByLabelText('Compliance relationship graph'),
    ).toBeVisible();
    expect(screen.getByText('Traceability change history')).toBeVisible();
    expect(
      screen.getByText('Definitive legal conclusions require human review.'),
    ).toBeVisible();

    fireEvent.change(screen.getByLabelText('Asset name'), {
      target: { value: 'Training dataset' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Dataset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add system asset' }));

    await waitFor(() =>
      expect(mockedApi.createSystemAsset).toHaveBeenCalledWith('project-1', {
        name: 'Training dataset',
        version: '',
        description: '',
        assetType: 'DATASET',
        lifecycleStage: 'DESIGN',
      }),
    );

    fireEvent.click(
      within(
        screen.getByRole('group', {
          name: 'Lifecycle stage for Candidate ranking model',
        }),
      ).getByRole('button', { name: 'Production' }),
    );
    await waitFor(() =>
      expect(mockedApi.updateSystemAsset).toHaveBeenCalledWith(
        'project-1',
        '0c9b13a9-3e4b-47ab-8840-06ed3ad437ae',
        { lifecycleStage: 'PRODUCTION' },
      ),
    );

    fireEvent.change(screen.getByLabelText('Organization or authority'), {
      target: { value: 'New Provider' },
    });
    fireEvent.change(screen.getByLabelText('Country code'), {
      target: { value: 'EE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add stakeholder' }));
    await waitFor(() =>
      expect(mockedApi.createComplianceStakeholder).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({
          role: 'PROVIDER',
          name: 'New Provider',
          country: 'EE',
        }),
      ),
    );

    fireEvent.change(screen.getByLabelText('Change notes'), {
      target: { value: 'Moved into production.' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Record lifecycle event' }),
    );
    await waitFor(() =>
      expect(mockedApi.createLifecycleEvent).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({
          stage: 'DESIGN',
          notes: 'Moved into production.',
          happenedAt: expect.any(String),
        }),
      ),
    );
  });

  it('shows a human reassessment notice after lifecycle changes', async () => {
    const baseModel = await mockedApi.getTraceabilityModel('project-1');
    mockedApi.getTraceabilityModel.mockResolvedValueOnce({
      ...baseModel,
      reassessment: {
        required: true,
        reason:
          '1 lifecycle event was recorded after this assessment was finalized.',
      },
    });

    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <MemoryRouter initialEntries={['/projects/project-1/traceability']}>
          <Routes>
            <Route
              path="/projects/:projectId/traceability"
              element={<ProjectTraceabilityPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText('Human reassessment required'),
    ).toBeVisible();
    expect(
      screen.getByText(/does not itself determine compliance/i),
    ).toBeVisible();
  });
});

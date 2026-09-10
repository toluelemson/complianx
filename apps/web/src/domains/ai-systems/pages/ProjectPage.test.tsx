import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectPage from './ProjectPage';
import * as aiSystemsApi from '../api';

vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    token: 'test-token',
    user: {
      id: 'owner-1',
      email: 'owner@example.com',
      role: 'USER',
      companies: [],
    },
    activeCompanyId: 'company-1',
    setActiveCompany: vi.fn(),
  }),
}));

vi.mock('@/app/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/WizardSidebar', () => ({
  WizardSidebar: ({
    setActiveStepId,
  }: {
    setActiveStepId: (id: string) => void;
  }) => (
    <button type="button" onClick={() => setActiveStepId('review_generate')}>
      Review &amp; Generate
    </button>
  ),
}));

vi.mock('@/domains/evidence/components/DocumentPreviewModal', () => ({
  DocumentPreviewModal: () => null,
}));

vi.mock('@/domains/reports/components/TemplateLibraryModal', () => ({
  default: () => null,
}));

vi.mock('@/domains/workflows/components/ReviewApprovalPanel', () => ({
  ReviewApprovalPanel: (props: {
    onSendForReview: () => void;
    sendForReviewDisabled?: boolean;
    sendForReviewLabel?: string;
    approverId?: string | null;
  }) => (
    <>
      <output data-testid="selected-approver">{props.approverId ?? ''}</output>
      <button
        type="button"
        onClick={props.onSendForReview}
        disabled={props.sendForReviewDisabled}
      >
        {props.sendForReviewLabel ?? 'Send for review'}
      </button>
    </>
  ),
}));

vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof aiSystemsApi>('../api');
  return {
    ...actual,
    getProject: vi.fn(),
    getProjectSections: vi.fn(),
    getProjectDocuments: vi.fn(),
    getGenerationReadiness: vi.fn(),
    listTemplates: vi.fn(),
    listProjectReminders: vi.fn(),
    listProjectReviewers: vi.fn(),
    getBillingPlan: vi.fn(),
    getBillingUsage: vi.fn(),
    getSectionAutosave: vi.fn(),
    createTemplate: vi.fn(),
    runProjectWorkflowAction: vi.fn(),
  };
});

const mockedApi = vi.mocked(aiSystemsApi);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/projects/project-1']}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  mockedApi.getProject.mockResolvedValue({
    id: 'project-1',
    name: 'Test system',
    companyId: 'company-1',
    viewerRole: 'OWNER',
    workflowStatus: 'DRAFT',
    workflowVersion: 1,
    owner: { email: 'owner@example.com' },
    createdAt: '2026-01-01T00:00:00.000Z',
  } as never);
  mockedApi.getProjectSections.mockResolvedValue(
    [
      [
        'system_overview',
        {
          purpose: 'Complete',
          intendedUsers: 'Users',
          deploymentContext: 'Cloud',
        },
      ],
      [
        'model_info',
        {
          modelType: 'Classifier',
          trainingData: 'Dataset',
          metrics: 'Accuracy',
        },
      ],
      [
        'data_governance',
        {
          dataSources: 'Sources',
          qualityChecks: 'Checks',
          privacy: 'Controls',
        },
      ],
      ['risk_assessment', { risks: 'Risks', likelihood: 'Low', impact: 'Low' }],
      ['human_oversight', { roles: 'Owner', escalations: 'Process' }],
      ['monitoring', { monitoringPlan: 'Plan', maintenance: 'Monthly' }],
    ].map(([name, content]) => ({
      id: `${name}-section`,
      name,
      content,
      updatedAt: '2026-01-01T00:00:00.000Z',
      comments: [],
      artifacts: [],
    })) as never,
  );
  mockedApi.getProjectDocuments.mockResolvedValue([]);
  mockedApi.getGenerationReadiness.mockResolvedValue({
    status: 'ready',
    score: 100,
    summary: 'Ready for generation',
    missingCriticalFields: [],
    weakSections: [],
  } as never);
  mockedApi.listTemplates.mockResolvedValue([]);
  mockedApi.listProjectReminders.mockResolvedValue([]);
  mockedApi.listProjectReviewers.mockResolvedValue([
    { id: 'reviewer-1', email: 'reviewer@example.com', role: 'REVIEWER' },
  ] as never);
  mockedApi.getBillingPlan.mockResolvedValue({
    plan: 'PRO',
    limits: { docs: 10 },
  } as never);
  mockedApi.getBillingUsage.mockResolvedValue({ docsGenerated: 0 } as never);
  mockedApi.getSectionAutosave.mockResolvedValue(null);
  mockedApi.createTemplate.mockResolvedValue({} as never);
  mockedApi.runProjectWorkflowAction.mockResolvedValue({} as never);
});

describe('ProjectPage integration', () => {
  it('opens and submits the template dialog', async () => {
    renderPage();

    await screen.findByDisplayValue('Complete');
    const saveButton = await screen.findByRole('button', {
      name: 'Save as Template',
    });
    fireEvent.click(saveButton);

    const nameInput = screen.getByLabelText('Template name');
    fireEvent.change(nameInput, { target: { value: 'Governance template' } });
    fireEvent.submit(nameInput);

    await waitFor(() => {
      expect(mockedApi.createTemplate).toHaveBeenCalledWith({
        name: 'Governance template',
        sectionName: 'system_overview',
        content: {
          purpose: 'Complete',
          intendedUsers: 'Users',
          deploymentContext: 'Cloud',
        },
      });
    });
    expect(
      screen.queryByRole('dialog', { name: 'Save as template' }),
    ).not.toBeInTheDocument();
  });

  it('allows an owner with complete sections to submit for review', async () => {
    renderPage();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Review & Generate' }),
    );

    const submitButton = await screen.findByRole('button', {
      name: 'Send for review',
    });
    await waitFor(() => expect(submitButton).toBeEnabled());
    expect(screen.getByTestId('selected-approver')).toHaveTextContent('');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedApi.runProjectWorkflowAction).toHaveBeenCalledWith({
        endpoint: '/projects/project-1/workflow/submit',
        body: {
          reviewerId: 'reviewer-1',
          approverId: undefined,
          note: undefined,
          expectedVersion: 1,
        },
      });
    });
  });
});

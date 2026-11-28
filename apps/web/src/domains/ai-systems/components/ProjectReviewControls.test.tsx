import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type {
  ProjectDetail,
  SectionWithMeta,
} from '@complianx/contracts/ai-systems';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import {
  getBillingPlan,
  listProjectReviewers,
  runProjectWorkflowAction,
} from '../api';
import { STEP_CONFIG } from '../constants/steps';
import { ProjectReviewControls } from './ProjectReviewControls';

vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'qa-admin', role: 'ADMIN' },
    activeCompanyId: 'qa-company',
  }),
}));

vi.mock('../api', () => ({
  getBillingPlan: vi.fn(),
  listProjectReviewers: vi.fn(),
  runProjectWorkflowAction: vi.fn(),
}));

describe('ProjectReviewControls', () => {
  it('includes the evidence section in the final approval gate', async () => {
    vi.mocked(getBillingPlan).mockResolvedValue({
      plan: 'PRO',
      limits: { docs: 10 },
    });
    vi.mocked(listProjectReviewers).mockResolvedValue([]);
    vi.mocked(runProjectWorkflowAction).mockResolvedValue({});

    const date = '2026-11-28T00:00:00.000Z';
    const project: ProjectDetail = {
      id: 'qa-project',
      name: 'Synthetic QA fixture',
      createdAt: date,
      companyId: 'qa-company',
      reviewerId: 'qa-admin',
      viewerRole: 'OWNER',
      workflowStatus: 'IN_REVIEW',
    };
    const documentation: SectionWithMeta[] = STEP_CONFIG.filter(
      (step) => step.fields.length > 0,
    ).map((step) => ({
      id: `section-${step.id}`,
      name: step.id,
      content: Object.fromEntries(
        step.fields.map((field) => [field.name, 'Synthetic test answer']),
      ),
      createdAt: date,
      updatedAt: date,
      comments: [],
      workflowStatus: 'APPROVED',
    }));
    const evidence: SectionWithMeta = {
      id: 'evidence-section',
      name: 'Evidence',
      content: {},
      createdAt: date,
      updatedAt: date,
      comments: [],
      workflowStatus: 'COMPLETE',
    };
    const client = new QueryClient();
    const view = (status: SectionWithMeta['workflowStatus']) => (
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ProjectReviewControls
            project={project}
            sections={[
              ...documentation,
              { ...evidence, workflowStatus: status },
            ]}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const { rerender } = render(view('COMPLETE'));
    expect(screen.getByText('Evidence')).toBeVisible();
    expect(
      await screen.findByRole('button', { name: 'Approve project' }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Start section review' }),
    );
    await waitFor(() =>
      expect(runProjectWorkflowAction).toHaveBeenCalledWith({
        endpoint: '/sections/evidence-section/workflow/start-review',
        body: {},
      }),
    );

    rerender(view('IN_REVIEW'));
    fireEvent.click(screen.getByRole('button', { name: 'Approve section' }));
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Evidence approval signature' }),
      {
        target: { value: 'Synthetic QA Test' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve section' }));
    await waitFor(() =>
      expect(runProjectWorkflowAction).toHaveBeenCalledWith({
        endpoint: '/sections/evidence-section/workflow/approve',
        body: { signature: 'Synthetic QA Test' },
      }),
    );

    rerender(view('APPROVED'));
    expect(
      screen.getByRole('button', { name: 'Approve project' }),
    ).toBeEnabled();
  });
});

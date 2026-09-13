import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FindingWorkflow } from './FindingWorkflow';
import { updateProjectFinding } from '../api';
vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({ activeCompanyId: 'company' }),
}));
vi.mock('../api', () => ({
  listObligationEvidence: vi.fn().mockResolvedValue([]),
  updateProjectFinding: vi.fn().mockResolvedValue({}),
  createRemediationAction: vi.fn(),
  updateRemediationAction: vi.fn(),
}));
const finding = {
  id: 'finding',
  source: 'MANUAL_REVIEW',
  severity: 'HIGH',
  status: 'READY_FOR_REVIEW',
  description: 'Gap',
  resolutionSummary: 'Controls fixed',
  actions: [],
};
function show(canEdit = true, canReview = true) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <FindingWorkflow
        projectId="project"
        finding={finding}
        canEdit={canEdit}
        canReview={canReview}
      />
    </QueryClientProvider>,
  );
}
beforeEach(() => vi.clearAllMocks());
describe('Finding workflow', () => {
  it('hides mutation controls from ordinary members', () => {
    show(false, false);
    expect(screen.queryByText('Manage finding')).not.toBeInTheDocument();
  });
  it('hides reviewer decisions from owners', () => {
    show(true, false);
    fireEvent.click(screen.getByText('Manage finding'));
    expect(
      screen.queryByRole('button', { name: 'RESOLVED' }),
    ).not.toBeInTheDocument();
  });
  it('requires a decision and sends it with the resolution summary', async () => {
    show();
    fireEvent.click(screen.getByText('Manage finding'));
    expect(screen.getByRole('button', { name: 'RESOLVED' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Reviewer decision'), {
      target: { value: 'Evidence verified' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'RESOLVED' }));
    await waitFor(() =>
      expect(updateProjectFinding).toHaveBeenCalledWith('project', 'finding', {
        status: 'RESOLVED',
        resolutionSummary: 'Controls fixed',
        reviewerDecision: 'Evidence verified',
      }),
    );
  });
});

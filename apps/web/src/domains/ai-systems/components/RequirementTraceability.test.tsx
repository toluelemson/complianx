import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RequirementTraceability } from './RequirementTraceability';

vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({ activeCompanyId: 'company-1' }),
}));

vi.mock('../api', async (loadOriginal) => {
  const original = await loadOriginal<typeof import('../api')>();
  return {
    ...original,
    getObligationTraceability: vi.fn().mockResolvedValue({
      requirement: {
        id: 'requirement-source',
        identifier: 'EUAI-HO-1',
        title: 'Human oversight',
        description: 'Document effective human oversight measures.',
        legalReference: 'Article 14',
        applicability: 'IN_PROGRESS',
      },
      applicability: { status: 'IN_PROGRESS', reason: 'High-risk system' },
      implementation: { approvalState: 'APPROVED' },
      evidence: [
        {
          id: 'link-1',
          linkType: 'PRIMARY',
          artifact: {
            id: 'artifact-1',
            originalName: 'human-oversight-policy.pdf',
            evidenceVersion: 2,
            uploadedAt: '2026-09-11T00:00:00Z',
            reviewerStatus: 'APPROVED',
            reviewer: { id: 'reviewer-1', email: 'jane@example.com' },
            reviewedAt: '2026-09-12T00:00:00Z',
          },
        },
      ],
      missingEvidence: [],
      review: {
        approvalState: 'APPROVED',
        approval: {
          actor: { id: 'approver-1', email: 'john@example.com' },
          decidedAt: '2026-09-13T00:00:00Z',
        },
      },
      packageInclusion: [
        {
          id: 'package-4',
          version: 4,
          createdAt: '2026-09-13T00:00:00Z',
          included: true,
        },
      ],
    }),
  };
});

describe('Requirement traceability', () => {
  it('shows evidence review, human approval, and package proof', async () => {
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <MemoryRouter>
          <RequirementTraceability
            projectId="project-1"
            requirement={{
              id: 'requirement-1',
              status: 'COMPLETE',
              approvalState: 'APPROVED',
              obligation: {
                title: 'Human oversight',
                legalReference: 'Article 14',
              },
            }}
            evidence={[
              {
                id: 'link-1',
                linkType: 'PRIMARY',
                artifact: {
                  id: 'artifact-1',
                  originalName: 'human-oversight-policy.pdf',
                  citationKey: 'E-1',
                  status: 'APPROVED',
                  version: 2,
                },
              },
            ]}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show why and proof' }));
    expect(await screen.findByText('human-oversight-policy.pdf')).toBeVisible();
    expect(screen.getByText(/Reviewed by jane@example.com/)).toBeVisible();
    expect(screen.getByText(/john@example.com/)).toBeVisible();
    expect(screen.getAllByText(/package v4/i).length).toBeGreaterThan(0);
  });
});

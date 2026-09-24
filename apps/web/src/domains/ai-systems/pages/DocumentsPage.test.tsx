import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DocumentsPage from './DocumentsPage';

vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    token: 'test-token',
    activeCompanyId: 'company',
    initializing: false,
  }),
}));
vi.mock('@/app/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/platform/analytics/marketing', () => ({
  trackMarketingEvent: vi.fn(),
}));
vi.mock('../api', () => ({
  listProjects: vi.fn().mockResolvedValue([
    {
      id: 'project-1',
      name: 'CarePath Triage',
      viewerRole: 'OWNER',
      sections: [],
      documents: [
        {
          id: 'ready-document',
          type: 'technical_doc',
          approvalState: 'APPROVED',
          lifecycleStatus: 'CURRENT',
          createdAt: '2026-09-20T00:00:00Z',
          version: 2,
        },
        {
          id: 'draft-document',
          type: 'technical_doc',
          approvalState: 'DRAFT',
          lifecycleStatus: 'CURRENT',
          createdAt: '2026-09-21T00:00:00Z',
          version: 3,
        },
      ],
    },
  ]),
}));

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <DocumentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('Document library', () => {
  it('helps people find a document and open its AI system or audit export', async () => {
    renderPage();

    const projectLinks = await screen.findAllByRole('link', {
      name: 'AI system: CarePath Triage',
    });
    expect(projectLinks).toHaveLength(2);
    expect(screen.getByText(/Version 2.*Ready/)).toBeInTheDocument();
    expect(projectLinks[0]).toHaveAttribute('href', '/projects/project-1');
    expect(screen.getAllByRole('link', { name: 'Open document' })[0])
      .toHaveAttribute('href', '/projects/project-1/compliance-package');
  });

  it('filters documents by simple status and search words', async () => {
    renderPage();

    await screen.findAllByRole('link', { name: 'AI system: CarePath Triage' });
    fireEvent.click(screen.getByRole('button', { name: /draft/i }));
    expect(screen.getByText(/Version 3.*Draft/)).toBeInTheDocument();
    expect(screen.queryByText(/Version 2.*Ready/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Find a document' }), {
      target: { value: 'no match' },
    });
    expect(screen.getByText('No documents match your search.')).toBeInTheDocument();
  });
});

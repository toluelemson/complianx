import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CompliancePackagePage from './CompliancePackagePage';
import { approveDocument, createCompliancePackage } from '../api';
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
vi.mock('../api', () => ({
  getProject: vi.fn().mockResolvedValue({
    name: 'Project',
    sections: [],
    statusEvents: [],
    viewerRole: 'APPROVER',
  }),
  getProjectDocuments: vi.fn().mockResolvedValue([
    {
      id: 'draft-document',
      type: 'technical_doc',
      approvalState: 'DRAFT',
      lifecycleStatus: 'CURRENT',
      createdAt: '2026-09-01T00:00:00Z',
    },
  ]),
  approveDocument: vi.fn().mockResolvedValue({ approvalState: 'APPROVED' }),
  listProjectObligations: vi.fn().mockResolvedValue([]),
  createCompliancePackage: vi.fn(),
  listCompliancePackages: vi.fn().mockResolvedValue([
    {
      id: 'old-package',
      version: 1,
      status: 'COMPLETE',
      manifestHash: 'abc',
      archiveHash: 'archive',
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'new-package',
      version: 2,
      status: 'INCOMPLETE',
      manifestHash: 'def',
      archiveHash: 'archive2',
      createdAt: '2026-09-02T00:00:00Z',
    },
    {
      id: 'legacy-package',
      version: 0,
      status: 'SNAPSHOT',
      manifestHash: 'ghi',
      archiveHash: null,
      createdAt: '2026-08-01T00:00:00Z',
    },
  ]),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({ ok: true, blob: async () => new Blob(['zip']) }),
  );
  URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
describe('Saved package download', () => {
  it('downloads the chosen historic snapshot and disables unavailable legacy archives', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/projects/project/package']}>
          <Routes>
            <Route
              path="/projects/:projectId/package"
              element={<CompliancePackagePage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Download export 1' }),
    );
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/ai-systems/project/reports/packages/old-package/download',
        ),
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Company-Id': 'company' }),
        }),
      ),
    );
    expect(
      screen.getByRole('button', { name: 'Download export 0 unavailable' }),
    ).toBeDisabled();
  });
  it('lets an assigned approver record the document decision', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/projects/project/package']}>
          <Routes>
            <Route
              path="/projects/:projectId/package"
              element={<CompliancePackagePage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Approve document' }),
    );
    await waitFor(() =>
      expect(approveDocument).toHaveBeenCalledWith('draft-document'),
    );
  });
  it('shows server readiness gaps with links to the relevant workflows', async () => {
    vi.mocked(createCompliancePackage).mockRejectedValueOnce({
      isAxiosError: true,
      message: 'Request failed with status code 400',
      response: {
        data: {
          message: 'Compliance package generation is blocked',
          gaps: [
            'Classification requires human review',
            'Project approval is outstanding',
            'Obligation obligation-1 is not approved',
            'Current documents require recorded human approval',
          ],
        },
      },
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/projects/project/package']}>
          <Routes>
            <Route
              path="/projects/:projectId/package"
              element={<CompliancePackagePage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const createButton = await screen.findByRole('button', {
      name: 'Create export',
    });
    await waitFor(() => expect(createButton).toBeEnabled());
    fireEvent.click(createButton);
    await waitFor(() => expect(createCompliancePackage).toHaveBeenCalled());

    expect(
      await screen.findByRole('heading', {
        name: 'This export is not ready yet',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('A person must check the work first'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Classification requires human review'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Review classification' }),
    ).toHaveAttribute('href', '/projects/project/classification');
    expect(screen.getByRole('link', { name: 'Open approval' })).toHaveAttribute(
      'href',
      '/projects/project/review-approval',
    );
    expect(
      screen.getByRole('link', { name: 'Open requirements' }),
    ).toHaveAttribute('href', '/projects/project/requirements');
    expect(
      screen.getByRole('link', { name: 'Review documents' }),
    ).toHaveAttribute(
      'href',
      '/projects/project/compliance-package#package-documents',
    );
  });
});

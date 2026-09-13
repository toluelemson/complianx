import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CompliancePackagePage from './CompliancePackagePage';
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
  getProject: vi
    .fn()
    .mockResolvedValue({ name: 'Project', sections: [], statusEvents: [] }),
  getProjectDocuments: vi.fn().mockResolvedValue([]),
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
    fireEvent.click(await screen.findByRole('button', { name: 'Download v1' }));
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
      screen.getByRole('button', { name: 'Archive unavailable' }),
    ).toBeDisabled();
  });
});

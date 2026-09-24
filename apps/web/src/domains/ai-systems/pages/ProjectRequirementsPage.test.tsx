import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectRequirementsPage from './ProjectRequirementsPage';
import * as api from '../api';

vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({ token: 'token', initializing: false, activeCompanyId: 'company-1' }),
}));
vi.mock('@/app/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../components/RequirementTraceability', () => ({
  RequirementTraceability: () => null,
}));
vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof api>('../api');
  return { ...actual, listProjectObligations: vi.fn(), listProjectReviewers: vi.fn(), listObligationEvidence: vi.fn(), updateProjectObligation: vi.fn() };
});

const mockedApi = vi.mocked(api);

describe('Project requirements ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.listProjectObligations.mockResolvedValue([
      { id: 'req-1', status: 'NOT_STARTED', approvalState: 'DRAFT', priority: 'MEDIUM', obligation: { title: 'Human oversight', key: 'oversight' } },
    ] as never);
    mockedApi.listProjectReviewers.mockResolvedValue([
      { id: 'member-1', email: 'owner@example.com', role: 'ADMIN' },
    ] as never);
    mockedApi.listObligationEvidence.mockResolvedValue([]);
    mockedApi.updateProjectObligation.mockResolvedValue({} as never);
  });

  it('assigns an owner and a due date inline', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/projects/project-1/requirements']}>
          <Routes><Route path="/projects/:projectId/requirements" element={<ProjectRequirementsPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText('Not started · Review: Not sent for review · Unassigned'),
    ).toBeVisible();

    fireEvent.change(await screen.findByLabelText('Owner for Human oversight'), { target: { value: 'member-1' } });
    await waitFor(() => expect(mockedApi.updateProjectObligation).toHaveBeenCalledWith('project-1', 'req-1', expect.objectContaining({ ownerId: 'member-1' })));

    fireEvent.change(screen.getByLabelText('Due date for Human oversight'), { target: { value: '2026-12-01' } });
    await waitFor(() => expect(mockedApi.updateProjectObligation).toHaveBeenCalledWith('project-1', 'req-1', expect.objectContaining({ dueAt: '2026-12-01' })));
  });
});

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectMessagesPage from './ProjectMessagesPage';
import * as aiSystemsApi from '../api';

vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    token: 'test-token',
    activeCompanyId: 'company-1',
    initializing: false,
  }),
}));
vi.mock('@/app/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../api', () => ({
  addSectionComment: vi.fn(),
  getProject: vi.fn(),
  getProjectSections: vi.fn(),
  setCommentResolution: vi.fn(),
}));

const mockedApi = vi.mocked(aiSystemsApi);

describe('Project messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getProject.mockResolvedValue({ name: 'Test system' } as never);
    mockedApi.getProjectSections.mockResolvedValue([
      {
        id: 'overview',
        name: 'system_overview',
        content: {},
        comments: [],
      },
      {
        id: 'risk',
        name: 'risk_assessment',
        content: {},
        comments: [],
      },
    ] as never);
    mockedApi.addSectionComment.mockResolvedValue({} as never);
  });

  it('shows and uses the selected discussion area', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/projects/project-1/messages']}>
          <Routes>
            <Route
              path="/projects/:projectId/messages"
              element={<ProjectMessagesPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Posting to system overview')).toBeVisible();
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'risk' },
    });
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Confirm the risk owner.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Post message' }));

    await waitFor(() =>
      expect(mockedApi.addSectionComment).toHaveBeenCalledWith('project-1', {
        sectionId: 'risk',
        body: 'Confirm the risk owner.',
      }),
    );
  });
});

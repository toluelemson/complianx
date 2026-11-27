import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AppShell } from './AppShell';
import api from '@/platform/api/client';

vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', role: 'USER', companies: [] },
    activeCompanyId: 'company-1',
    logout: vi.fn(),
    setActiveCompany: vi.fn(),
  }),
}));
vi.mock('@/domains/billing/components/BillingModal', () => ({
  default: () => null,
}));
vi.mock('@/platform/api/client', () => ({
  __esModule: true,
  default: { get: vi.fn(), post: vi.fn() },
}));

function LocationLabel() {
  return <p data-testid="location">{useLocation().pathname}</p>;
}

function renderShell(path = '/dashboard', projectId?: string) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[path]}>
        <AppShell projectId={projectId}>
          <LocationLabel />
        </AppShell>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AppShell notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path === '/notifications/count')
        return Promise.resolve({ data: { count: 1 } });
      if (path.startsWith('/notifications?')) {
        return Promise.resolve({
          data: [
            {
              id: 'notification-1',
              title: 'Review requested: CarePath',
              body: 'A project requires your review.',
              createdAt: '2026-09-24T08:00:00.000Z',
              meta: { projectId: 'project-1' },
            },
          ],
        });
      }
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });
    vi.mocked(api.post).mockResolvedValue({ data: { ok: true } });
  });

  it('opens linked work and marks the notification as read', async () => {
    renderShell();

    const triggers = await screen.findAllByRole('button', {
      name: 'Notifications',
    });
    fireEvent.click(triggers[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Open' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/notifications/notification-1/read',
      ),
    );
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/projects/project-1',
    );
  });

  it('links to a dedicated advanced tools page without a dropdown', () => {
    renderShell('/projects/project-1/overview', 'project-1');

    expect(screen.queryByRole('button', { name: 'Advanced tools' })).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Advanced tools' }),
    ).toHaveAttribute('href', '/projects/project-1/advanced');
  });

  it('presents the canonical five-stage workflow and keeps comply tasks available', () => {
    renderShell('/projects/project-1/overview', 'project-1');

    expect(screen.getByRole('link', { name: '1. Register' })).toHaveAttribute(
      'href',
      '/projects/project-1/ai-system-profile',
    );
    expect(screen.getByRole('link', { name: '2. Assess' })).toHaveAttribute(
      'href',
      '/projects/project-1/classification',
    );
    expect(screen.getByRole('link', { name: '3. Comply' })).toHaveAttribute(
      'href',
      '/projects/project-1/requirements',
    );
    expect(screen.getByRole('link', { name: '4. Review' })).toHaveAttribute(
      'href',
      '/projects/project-1/review-approval',
    );
    expect(screen.getByRole('link', { name: '5. Report' })).toHaveAttribute(
      'href',
      '/projects/project-1/compliance-package',
    );
    expect(
      screen.getByRole('link', { name: 'Evidence and proof' }),
    ).toHaveAttribute('href', '/projects/project-1/evidence');
  });
});

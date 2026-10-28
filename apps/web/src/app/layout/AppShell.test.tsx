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

function renderShell() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell>
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
      if (path === '/notifications/count') return Promise.resolve({ data: { count: 1 } });
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
      expect(api.post).toHaveBeenCalledWith('/notifications/notification-1/read'),
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/projects/project-1');
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BillingModal from './BillingModal';
import api from '../api/client';

vi.mock('../api/client', () => {
  return {
    __esModule: true,
    default: {
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

function renderModal() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BillingModal isOpen onClose={() => {}} />
    </QueryClientProvider>,
  );
}

describe('BillingModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as unknown as vi.Mock).mockImplementation((path: string) => {
      if (path === '/billing/plan') {
        return Promise.resolve({
          data: { plan: 'FREE', limits: { docs: 10, trust: 5 } },
        });
      }
      if (path === '/billing/usage') {
        return Promise.resolve({
          data: { month: '2025-11', docsGenerated: 2, trustAnalyses: 1 },
        });
      }
      return Promise.reject(new Error('unknown path'));
    });
    (api.post as unknown as vi.Mock).mockResolvedValue({ data: { url: null } });
  });

  it('shows plan, usage and allows upgrading', async () => {
    renderModal();

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/billing/plan'),
    );

    expect(screen.getByText(/Plan: FREE/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Documents generated: 2/i),
    ).toBeInTheDocument();

    const upgradeButton = screen.getByRole('button', {
      name: /Upgrade to Pro/i,
    });
    fireEvent.click(upgradeButton);

    expect(api.post).toHaveBeenCalledWith('/billing/checkout', {
      plan: 'PRO',
    });
  });

  it('renders portal button for paid plans', async () => {
    (api.get as unknown as vi.Mock).mockImplementation((path: string) => {
      if (path === '/billing/plan') {
        return Promise.resolve({
          data: { plan: 'PRO', limits: { docs: 999, trust: 999 } },
        });
      }
      if (path === '/billing/usage') {
        return Promise.resolve({
          data: { month: '2025-11', docsGenerated: 8, trustAnalyses: 2 },
        });
      }
      return Promise.reject(new Error('unknown path'));
    });
    renderModal();

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Manage subscription/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Manage subscription/i }),
    );
    expect(api.post).toHaveBeenCalledWith('/billing/portal');
  });
});

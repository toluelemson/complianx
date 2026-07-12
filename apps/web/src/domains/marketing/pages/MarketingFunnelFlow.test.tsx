import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';
import SubmitSystemPage from '@/domains/ai-systems/pages/SubmitSystemPage';

let authState = {
  token: undefined as string | undefined,
  initializing: false,
};

vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/domains/marketing/components/Hero', () => ({
  Hero: () => <div>Hero</div>,
}));

vi.mock('@/domains/marketing/components/FaqSection', () => ({
  FaqSection: () => <div>FAQ</div>,
}));

vi.mock('@/domains/marketing/components/CTASection', () => ({
  CTASection: () => <div>CTA</div>,
}));

vi.mock('@/domains/marketing/components/Navbar', () => ({
  Navbar: () => <div>Navbar</div>,
}));

vi.mock('@/domains/marketing/components/PricingSection', () => ({
  PricingSection: () => <div>Pricing</div>,
}));

vi.mock('@/domains/marketing/components/VideoSection', () => ({
  VideoSection: ({
    onOpenTrial,
  }: {
    onOpenTrial: () => void;
    videoSrc?: string;
  }) => (
    <button type="button" onClick={onOpenTrial}>
      Open trial
    </button>
  ),
}));

function mockMatchMedia(matchesPointerFine: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(pointer:fine)' ? matchesPointerFine : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function renderFlow() {
  const queryClient = new QueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/submit-system" element={<SubmitSystemPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Marketing funnel flow', () => {
  beforeEach(() => {
    authState = { token: undefined, initializing: false };
    window.localStorage.clear();
    mockMatchMedia(true);
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
      writable: true,
    });
  });

  it('navigates from landing modal to a context-aware submit page', async () => {
    renderFlow();

    fireEvent.click(screen.getByRole('button', { name: 'Open trial' }));
    fireEvent.click(screen.getByRole('link', { name: 'Submit your system' }));

    expect(
      await screen.findByText('Share the AI system behind the workflow you just saw'),
    ).toBeInTheDocument();
    expect(screen.getByText('Book an enterprise demo').closest('p')).toHaveTextContent(
      'Best first response: 48 hours.',
    );
  });
});

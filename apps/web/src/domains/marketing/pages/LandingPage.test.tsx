import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from './LandingPage';

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

function renderLandingPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe('LandingPage modal behavior', () => {
  beforeEach(() => {
    authState = { token: undefined, initializing: false };
    window.localStorage.clear();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
      writable: true,
    });
    mockMatchMedia(true);
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 3000,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 1000,
      writable: true,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 0,
      writable: true,
    });
  });

  it('does not auto-open when the modal was previously dismissed', () => {
    window.localStorage.setItem(
      'neuraldocx_trial_modal_dismissed_until',
      String(Date.now() + 60_000),
    );

    renderLandingPage();
    fireEvent.mouseOut(document, { clientY: 0, relatedTarget: null });

    expect(
      screen.queryByText('Before you go, see the fastest way to start'),
    ).not.toBeInTheDocument();
  });

  it('opens on desktop exit intent', () => {
    renderLandingPage();
    fireEvent.mouseOut(document, { clientY: 0, relatedTarget: null });

    expect(
      screen.getByText('Before you go, see the fastest way to start'),
    ).toBeInTheDocument();
  });

  it('opens on deep scroll for desktop but not for mobile', () => {
    renderLandingPage();

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 1400,
    });
    fireEvent.scroll(window);

    expect(screen.getByText('Start with NeuralDocx')).toBeInTheDocument();

    window.localStorage.clear();
    mockMatchMedia(false);
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
      writable: true,
    });

    renderLandingPage();

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 1400,
    });
    fireEvent.scroll(window);
    fireEvent.mouseOut(document, { clientY: 0, relatedTarget: null });

    expect(
      screen.queryByText('Before you go, see the fastest way to start'),
    ).not.toBeInTheDocument();
  });

  it('marks conversion persistence after the primary CTA is clicked', () => {
    renderLandingPage();
    fireEvent.click(screen.getByRole('button', { name: 'Open trial' }));
    fireEvent.click(screen.getByRole('link', { name: 'Submit your system' }));

    expect(
      window.localStorage.getItem('neuraldocx_trial_modal_converted'),
    ).toBe('true');
  });
});

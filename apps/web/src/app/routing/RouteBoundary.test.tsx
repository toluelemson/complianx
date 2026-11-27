import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { lazy } from 'react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RouteBoundary } from './RouteBoundary';

describe('RouteBoundary', () => {
  it('shows a loading status while navigating to a lazy page', async () => {
    const Requirements = () => <h1>Requirements</h1>;
    let finishLoading!: (module: { default: typeof Requirements }) => void;
    const pendingModule = new Promise<{ default: typeof Requirements }>(
      (resolve) => {
        finishLoading = resolve;
      },
    );
    const LazyRequirements = lazy(() => pendingModule);

    render(
      <MemoryRouter>
        <RouteBoundary>
          <Routes>
            <Route
              path="/"
              element={<Link to="/requirements">Open requirements</Link>}
            />
            <Route path="/requirements" element={<LazyRequirements />} />
          </Routes>
        </RouteBoundary>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Open requirements' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Loading page');
    expect(screen.queryByRole('link', { name: 'Open requirements' })).toBeNull();

    await act(async () => finishLoading({ default: Requirements }));

    expect(
      screen.getByRole('heading', { name: 'Requirements' }),
    ).toBeVisible();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('offers a reload when a page fails and recovers on navigation', async () => {
    const FailedPage = lazy(() =>
      Promise.reject(new Error('Unable to fetch the route module')),
    );

    render(
      <MemoryRouter initialEntries={['/unavailable']}>
        <Link to="/">Open dashboard</Link>
        <RouteBoundary>
          <Routes>
            <Route path="/unavailable" element={<FailedPage />} />
            <Route path="/" element={<h1>Dashboard</h1>} />
          </Routes>
        </RouteBoundary>
      </MemoryRouter>,
      { onCaughtError: vi.fn() },
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This page couldn’t load',
    );
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeVisible();

    fireEvent.click(screen.getByRole('link', { name: 'Open dashboard' }));

    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { AUTH_EXPIRED_EVENT } from '../../platform/api/client';
import { AuthProvider, useAuth, type User } from './AuthContext';

const user: User = {
  id: 'user-1',
  email: 'user@example.com',
  role: 'USER',
  createdAt: '2026-09-13T00:00:00.000Z',
  updatedAt: '2026-09-13T00:00:00.000Z',
};

function AuthState() {
  const { token } = useAuth();
  return <div>{token ?? 'signed-out'}</div>;
}

describe('AuthProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('clears a stored session when the API reports that it expired', () => {
    window.localStorage.setItem(
      'aicd_auth',
      JSON.stringify({ user, token: 'stale-token' }),
    );

    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );
    expect(screen.getByText('stale-token')).toBeInTheDocument();

    act(() => window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT)));

    expect(screen.getByText('signed-out')).toBeInTheDocument();
    expect(window.localStorage.getItem('aicd_auth')).toBeNull();
  });
});

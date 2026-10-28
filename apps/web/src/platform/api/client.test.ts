import { afterEach, describe, expect, it, vi } from 'vitest';
import api, { AUTH_EXPIRED_EVENT, setAuthToken } from './client';

describe('API authentication handling', () => {
  afterEach(() => {
    setAuthToken(undefined);
  });

  it('emits one expiration event and stops sending a rejected token', async () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener);
    setAuthToken('stale-token');
    const rejectUnauthorized = () =>
      Promise.reject({ response: { status: 401 } });

    await expect(
      api.get('/projects', { adapter: rejectUnauthorized }),
    ).rejects.toBeDefined();
    await expect(
      api.get('/company', { adapter: rejectUnauthorized }),
    ).rejects.toBeDefined();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(api.defaults.headers.common['Authorization']).toBeUndefined();
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
  });
});

import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { shouldRetryQuery } from './query-client';

describe('query retry policy', () => {
  it('does not retry client errors such as a missing project', () => {
    const error = new AxiosError(
      'Not found',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      { status: 404 } as never,
    );

    expect(shouldRetryQuery(0, error)).toBe(false);
  });

  it('allows bounded retries for transient failures', () => {
    expect(shouldRetryQuery(0, new Error('Network unavailable'))).toBe(true);
    expect(shouldRetryQuery(2, new Error('Network unavailable'))).toBe(false);
  });
});

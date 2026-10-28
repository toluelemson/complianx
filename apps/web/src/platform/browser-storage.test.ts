import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  readBrowserStorage,
  removeBrowserStorage,
  writeBrowserStorage,
} from './browser-storage';

describe('browser storage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not throw when the browser blocks storage access', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Access to storage is not allowed from this context.');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Access to storage is not allowed from this context.');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('Access to storage is not allowed from this context.');
    });

    expect(readBrowserStorage('auth')).toBeNull();
    expect(() => writeBrowserStorage('auth', '{}')).not.toThrow();
    expect(() => removeBrowserStorage('auth')).not.toThrow();
  });
});

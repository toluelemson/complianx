import { describe, expect, it, vi } from 'vitest';
import { trackMarketingEvent } from './marketing';

describe('product analytics privacy', () => {
  it('emits event names without confidential workspace data', () => {
    const listener = vi.fn();
    window.addEventListener('marketing:track', listener);

    trackMarketingEvent('package_generated');

    expect(listener).toHaveBeenCalledOnce();
    const detail = listener.mock.calls[0][0].detail;
    expect(detail).toEqual({ eventName: 'package_generated', payload: {} });
    expect(JSON.stringify(detail)).not.toContain('intendedUse');
    expect(JSON.stringify(detail)).not.toContain('evidence');
    window.removeEventListener('marketing:track', listener);
  });
});

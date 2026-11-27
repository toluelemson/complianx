import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HelpTooltip } from './help-tooltip';

describe('HelpTooltip', () => {
  it('provides an accessible help control and tooltip content', () => {
    render(
      <HelpTooltip label="Explain target band">
        The readiness target for this assessment.
      </HelpTooltip>,
    );
    expect(
      screen.getByRole('button', { name: 'Explain target band' }),
    ).toHaveAttribute('aria-describedby');
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'The readiness target for this assessment.',
    );
  });
});

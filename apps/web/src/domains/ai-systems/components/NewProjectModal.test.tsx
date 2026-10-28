import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NewProjectModal } from './NewProjectModal';

describe('NewProjectModal', () => {
  it('keeps the first step focused on the required system name', async () => {
    const onSubmit = vi.fn();

    render(
      <NewProjectModal isOpen onClose={vi.fn()} onSubmit={onSubmit} />,
    );

    expect(screen.getByText('Required')).toBeVisible();
    expect(screen.getByText('Add context now (optional)')).toBeVisible();
    expect(screen.queryByLabelText('Intended use')).not.toBeVisible();

    fireEvent.change(screen.getByRole('textbox', { name: /system name/i }), {
      target: { value: 'Harbor Assist' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue to EU AI Act questions' }),
    );

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Harbor Assist' }),
      ),
    );
  });
});

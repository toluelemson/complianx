import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSectionAutosave, saveSectionAutosave } from '../api';
import { useProjectAutosave } from './useProjectAutosave';

vi.mock('../api', () => ({
  getSectionAutosave: vi.fn(),
  saveSectionAutosave: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ toast: { error: vi.fn() } }));

const mockedGet = vi.mocked(getSectionAutosave);
const mockedSave = vi.mocked(saveSectionAutosave);

const section = (id: string, content: Record<string, string> = {}) =>
  ({ id, name: id, content, updatedAt: '2026-01-01T00:00:00.000Z' }) as never;

describe('useProjectAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockedGet.mockResolvedValue(null);
    mockedSave.mockResolvedValue({
      updatedAt: '2026-01-01T00:00:01.000Z',
    } as never);
  });

  it('does not autosave initial values', () => {
    renderHook(() =>
      useProjectAutosave(
        section('one', { purpose: 'Initial' }),
        { purpose: 'Initial' },
        true,
      ),
    );
    act(() => vi.advanceTimersByTime(1499));
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it('saves modified values after the debounce and does not repeat unchanged content', async () => {
    const { rerender } = renderHook(
      ({ values }) =>
        useProjectAutosave(
          section('one', { purpose: 'Initial' }),
          values,
          true,
        ),
      { initialProps: { values: { purpose: 'Initial' } } },
    );
    rerender({ values: { purpose: 'Changed' } });
    act(() => vi.advanceTimersByTime(1500));
    await act(async () => undefined);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(3000));
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });

  it('ignores recovery responses from a section that is no longer active', async () => {
    let resolveOne!: (value: unknown) => void;
    let resolveTwo!: (value: unknown) => void;
    mockedGet.mockImplementation(
      (id) =>
        new Promise((resolve) => {
          if (id === 'one') resolveOne = resolve;
          else resolveTwo = resolve;
        }) as never,
    );
    const { result, rerender } = renderHook(
      ({ id }) => useProjectAutosave(section(id), {}, true),
      { initialProps: { id: 'one' } },
    );
    rerender({ id: 'two' });
    await act(async () => {
      resolveOne({
        content: { purpose: 'stale' },
        updatedAt: '2026-02-01T00:00:00.000Z',
      });
      resolveTwo({
        content: { purpose: 'current' },
        updatedAt: '2026-02-01T00:00:00.000Z',
      });
    });
    expect(result.current.autosaveRecovery?.content).toEqual({
      purpose: 'current',
    });
  });

  it('ignores an older save response after a newer save starts', async () => {
    const pending: Array<(value: unknown) => void> = [];
    mockedSave.mockImplementation(
      () => new Promise((resolve) => pending.push(resolve)) as never,
    );
    const { rerender, result } = renderHook(
      ({ values }) =>
        useProjectAutosave(
          section('one', { purpose: 'Initial' }),
          values,
          true,
        ),
      { initialProps: { values: { purpose: 'Initial' } } },
    );
    rerender({ values: { purpose: 'First' } });
    act(() => vi.advanceTimersByTime(1500));
    rerender({ values: { purpose: 'Second' } });
    act(() => vi.advanceTimersByTime(1500));
    await act(async () => {
      pending[0]({ updatedAt: '2026-01-01T00:00:02.000Z' });
      pending[1]({ updatedAt: '2026-01-01T00:00:03.000Z' });
    });
    expect(result.current.lastSavedAt).toBe('2026-01-01T00:00:03.000Z');
  });

  it('performs a best-effort flush when navigating away with dirty values', async () => {
    const { rerender } = renderHook(
      ({ id, values }) =>
        useProjectAutosave(
          section(id, { purpose: id === 'one' ? 'Initial' : '' }),
          values,
          true,
        ),
      { initialProps: { id: 'one', values: { purpose: 'Initial' } } },
    );
    rerender({ id: 'one', values: { purpose: 'Changed' } });
    rerender({ id: 'two', values: { purpose: '' } });
    await act(async () => undefined);
    expect(mockedSave).toHaveBeenCalledWith({
      sectionId: 'one',
      content: { purpose: 'Changed' },
    });
  });

  it('does not save the previous form values into a newly selected section', () => {
    const { rerender } = renderHook(
      ({ id, values }) =>
        useProjectAutosave(
          section(id, { purpose: id === 'one' ? 'First section' : 'Second section' }),
          values,
          true,
        ),
      { initialProps: { id: 'one', values: { purpose: 'First section' } } },
    );

    // The first render after a section switch still contains the prior form.
    rerender({ id: 'two', values: { purpose: 'First section' } });
    act(() => vi.advanceTimersByTime(1500));

    expect(mockedSave).not.toHaveBeenCalled();

    // The new section then finishes loading. This is still not a user edit.
    rerender({ id: 'two', values: { purpose: 'Second section' } });
    act(() => vi.advanceTimersByTime(1500));

    expect(mockedSave).not.toHaveBeenCalled();
  });

  it('does not flush stale values while a new section is still loading', () => {
    const { rerender, unmount } = renderHook(
      ({ id, values }) =>
        useProjectAutosave(
          section(id, { purpose: id === 'one' ? 'First section' : 'Second section' }),
          values,
          true,
        ),
      { initialProps: { id: 'one', values: { purpose: 'First section' } } },
    );

    rerender({ id: 'two', values: { purpose: 'First section' } });
    unmount();

    expect(mockedSave).not.toHaveBeenCalled();
  });
});

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type {
  FormValues,
  SectionWithMeta,
} from '@complianx/contracts/ai-systems';
import { getSectionAutosave, saveSectionAutosave } from '../api';

type Recovery = { content: FormValues; updatedAt: string };
const snapshotOf = (value: unknown) => JSON.stringify(value ?? null);

export function useProjectAutosave(
  currentSection: SectionWithMeta | undefined,
  formValues: FormValues,
  isFormStep: boolean,
) {
  const sectionId = currentSection?.id;
  const activeSectionRef = useRef(sectionId);
  const baselineRef = useRef(snapshotOf(currentSection?.content));
  const latestSnapshotRef = useRef(snapshotOf(formValues));
  const pendingSectionRef = useRef<{ id: string; content: FormValues } | null>(
    null,
  );
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestVersionRef = useRef(0);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<Recovery | null>(null);

  const save = useCallback(async (id: string, content: FormValues) => {
    const version = ++requestVersionRef.current;
    if (mountedRef.current && activeSectionRef.current === id)
      setStatus('saving');
    try {
      const data = await saveSectionAutosave({ sectionId: id, content });
      if (
        !mountedRef.current ||
        activeSectionRef.current !== id ||
        version !== requestVersionRef.current
      )
        return;
      baselineRef.current = snapshotOf(content);
      const hasNewerEdits = latestSnapshotRef.current !== baselineRef.current;
      dirtyRef.current = hasNewerEdits;
      if (hasNewerEdits) {
        setStatus('idle');
        return;
      }
      setStatus('saved');
      setLastSavedAt(data.updatedAt ?? new Date().toISOString());
      window.setTimeout(() => {
        if (
          mountedRef.current &&
          activeSectionRef.current === id &&
          version === requestVersionRef.current
        )
          setStatus('idle');
      }, 2000);
    } catch {
      if (
        mountedRef.current &&
        activeSectionRef.current === id &&
        version === requestVersionRef.current
      ) {
        setStatus('idle');
        toast.error('Autosave failed');
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      const pending = pendingSectionRef.current;
      if (dirtyRef.current && pending) void save(pending.id, pending.content);
    };
  }, [save, sectionId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    activeSectionRef.current = sectionId;
    requestVersionRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    baselineRef.current = snapshotOf(currentSection?.content);
    latestSnapshotRef.current = snapshotOf(formValues);
    dirtyRef.current = false;
    pendingSectionRef.current = sectionId
      ? { id: sectionId, content: formValues }
      : null;
    setRecovery(null);
    setLastSavedAt(currentSection?.updatedAt ?? null);
    if (!sectionId) return;
    const requestVersion = requestVersionRef.current;
    getSectionAutosave(sectionId)
      .then((autosave) => {
        if (
          !autosave ||
          !mountedRef.current ||
          activeSectionRef.current !== sectionId ||
          requestVersion !== requestVersionRef.current
        )
          return;
        if (
          new Date(autosave.updatedAt).getTime() >
          new Date(currentSection?.updatedAt ?? 0).getTime()
        )
          setRecovery({
            content: autosave.content,
            updatedAt: autosave.updatedAt,
          });
      })
      .catch(() => undefined);
  }, [sectionId]);

  useEffect(() => {
    if (!isFormStep || !sectionId) return;
    const snapshot = snapshotOf(formValues);
    latestSnapshotRef.current = snapshot;
    if (snapshot === baselineRef.current) {
      dirtyRef.current = false;
      return;
    }
    dirtyRef.current = true;
    pendingSectionRef.current = { id: sectionId, content: formValues };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (activeSectionRef.current === sectionId && dirtyRef.current)
        void save(sectionId, formValues);
    }, 1500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [formValues, isFormStep, save, sectionId]);

  return {
    autosaveStatus: status,
    lastSavedAt,
    autosaveRecovery: recovery,
    dismissRecovery: () => setRecovery(null),
    restoreRecovery: () => {
      if (!recovery) return null;
      setLastSavedAt(recovery.updatedAt);
      setRecovery(null);
      return recovery.content;
    },
    markSaved: (timestamp = new Date().toISOString()) => {
      baselineRef.current = latestSnapshotRef.current;
      dirtyRef.current = false;
      setLastSavedAt(timestamp);
    },
  };
}

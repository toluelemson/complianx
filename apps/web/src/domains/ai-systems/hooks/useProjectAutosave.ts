import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type {
  FormValues,
  SectionWithMeta,
} from '@complianx/contracts/ai-systems';
import { getSectionAutosave, saveSectionAutosave } from '../api';

type Recovery = { content: FormValues; updatedAt: string };

export function useProjectAutosave(
  currentSection: SectionWithMeta | undefined,
  formValues: FormValues,
  isFormStep: boolean,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const mutation = useMutation({
    mutationFn: saveSectionAutosave,
    onMutate: () => setStatus('saving'),
    onSuccess: (data) => {
      setStatus('saved');
      setLastSavedAt(data.updatedAt ?? new Date().toISOString());
      setTimeout(() => setStatus('idle'), 2000);
    },
    onError: () => {
      setStatus('idle');
      toast.error('Autosave failed');
    },
  });

  useEffect(() => {
    if (!isFormStep || !currentSection) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      mutation.mutate({ sectionId: currentSection.id, content: formValues });
    }, 1500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentSection, formValues, isFormStep, mutation]);

  useEffect(() => {
    if (!currentSection) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastSavedAt(currentSection.updatedAt ?? null);
    setRecovery(null);
    getSectionAutosave(currentSection.id)
      .then((autosave) => {
        if (
          autosave &&
          new Date(autosave.updatedAt).getTime() >
            new Date(currentSection.updatedAt ?? 0).getTime()
        ) {
          setRecovery({
            content: autosave.content,
            updatedAt: autosave.updatedAt,
          });
        }
      })
      .catch(() => {});
  }, [currentSection]);

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
    markSaved: (timestamp = new Date().toISOString()) =>
      setLastSavedAt(timestamp),
  };
}

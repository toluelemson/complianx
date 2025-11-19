import { useEffect, useState } from 'react';

interface CloneProjectModalProps {
  isOpen: boolean;
  projectName: string;
  defaultName: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export function CloneProjectModal({
  isOpen,
  projectName,
  defaultName,
  isSubmitting,
  onClose,
  onSubmit,
}: CloneProjectModalProps) {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(defaultName);
  }, [defaultName, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          Duplicate “{projectName}”
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Create a new project pre-filled with the same section data so you can
          reuse templates across teams.
        </p>
        <label className="mt-6 block text-sm font-medium text-slate-700">
          New project name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </label>
        <div className="mt-6 flex justify-end gap-3 text-sm">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(name)}
            disabled={!name || isSubmitting}
            className="rounded-md bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {isSubmitting ? 'Cloning...' : 'Create Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}

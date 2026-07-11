import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md rounded-[1.75rem] border-slate-200/90 bg-white/95 shadow-[0_35px_100px_-40px_rgba(15,23,42,0.45)]">
        <CardContent className="p-6">
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
          Duplicate “{projectName}”
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Create a new project pre-filled with the same section data so you can
          reuse templates across teams.
        </p>
        <label className="mt-6 block text-sm font-medium text-slate-700">
          New project name
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1"
          />
        </label>
        <div className="mt-6 flex justify-end gap-3 text-sm">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit(name)}
            disabled={!name || isSubmitting}
            className="bg-slate-950 text-white hover:bg-black"
          >
            {isSubmitting ? 'Cloning...' : 'Create Copy'}
          </Button>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}

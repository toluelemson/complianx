// AI systems cloning UI.
import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';

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
      <Card className="w-full max-w-md rounded-xl border-slate-200 bg-white shadow-2xl">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
            Create a system from “{projectName}”
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Reuse the existing control structure as a starting point for
            another AI system.
          </p>
          <label className="mt-6 block text-sm font-medium text-slate-700">
            New system name
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1"
            />
          </label>
          <div className="mt-6 flex justify-end gap-3 text-sm">
            <Button type="button" onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button
              onClick={() => onSubmit(name)}
              disabled={!name || isSubmitting}
              className="bg-[#d40c2e] text-white hover:bg-[#e21236]"
            >
              {isSubmitting ? 'Creating...' : 'Create system'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

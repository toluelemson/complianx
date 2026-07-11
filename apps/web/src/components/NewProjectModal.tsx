import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export interface NewProjectFormValues {
  name: string;
  industry?: string;
  riskLevel?: string;
}

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: NewProjectFormValues) => void;
  isSubmitting?: boolean;
}

export function NewProjectModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: NewProjectModalProps) {
  const { register, handleSubmit, reset } = useForm<NewProjectFormValues>({
    defaultValues: { name: '', industry: '', riskLevel: '' },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg rounded-[1.75rem] border-slate-200/90 bg-white/95 shadow-[0_35px_100px_-40px_rgba(15,23,42,0.45)]">
        <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
            New AI System
          </h2>
          <button onClick={onClose} className="text-slate-500 transition hover:text-slate-900">
            ✕
          </button>
        </div>
        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit((values) => {
            onSubmit(values);
            reset();
          })}
        >
          <label className="block text-sm font-medium text-slate-700">
            Project Name
            <Input
              {...register('name', { required: true })}
              className="mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Industry
            <Input
              {...register('industry')}
              className="mt-1"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Risk Level
            <Select
              {...register('riskLevel')}
              className="mt-1"
            >
              <option value="">Select</option>
              <option value="minimal">Minimal</option>
              <option value="limited">Limited</option>
              <option value="high">High</option>
            </Select>
          </label>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-slate-950 text-white hover:bg-black"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
        </CardContent>
      </Card>
    </div>
  );
}

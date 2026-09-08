// AI systems creation UI.
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';

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
      <Card className="w-full max-w-lg rounded-xl border-slate-200 bg-white shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
              Register an AI system
            </h2>
            <button
              onClick={onClose}
              className="text-slate-500 transition hover:text-slate-900"
            >
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
            <p className="max-w-md text-sm leading-6 text-slate-500">
              Start with the system context. You can add detailed controls,
              evidence, owners, and obligations after registration.
            </p>
            <label className="block text-sm font-medium text-slate-700">
              System name
              <Input
                {...register('name', { required: true })}
                className="mt-1"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Operating domain
              <Input {...register('industry')} className="mt-1" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Initial risk indication
              <Select {...register('riskLevel')} className="mt-1">
                <option value="">Not assessed</option>
                <option value="minimal">Minimal</option>
                <option value="limited">Limited</option>
                <option value="high">High</option>
              </Select>
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" onClick={onClose} variant="outline">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#d40c2e] text-white hover:bg-[#e21236]"
              >
                {isSubmitting ? 'Registering...' : 'Register system'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

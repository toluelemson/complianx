import { useForm } from 'react-hook-form';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            New AI System
          </h2>
          <button onClick={onClose} className="text-slate-500">
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
            <input
              {...register('name', { required: true })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Industry
            <input
              {...register('industry')}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Risk Level
            <select
              {...register('riskLevel')}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Select</option>
              <option value="minimal">Minimal</option>
              <option value="limited">Limited</option>
              <option value="high">High</option>
            </select>
          </label>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

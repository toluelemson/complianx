// AI systems creation UI.
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';

export interface NewProjectFormValues {
  name: string;
  industry?: string;
  description?: string;
  businessPurpose?: string;
  intendedUse?: string;
  intendedUsers?: string;
  affectedPersons?: string;
  deploymentGeography?: string;
  operatorRoles?: string[];
  lifecycleStage?: string;
  responsibleOwner?: string;
  providerOrDeveloper?: string;
  deployerOrUser?: string;
  importer?: string;
  distributor?: string;
  authorizedRepresentative?: string;
  generatesContent?: boolean;
  useCaseIndicators?: string[];
  dueDate?: string;
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
    defaultValues: {
      name: '',
      industry: '',
      description: '',
      businessPurpose: '',
      intendedUse: '',
      intendedUsers: '',
      affectedPersons: '',
      deploymentGeography: '',
      lifecycleStage: 'UNKNOWN',
      operatorRoles: [],
      useCaseIndicators: [],
      generatesContent: false,
      dueDate: '',
    },
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
              Start with the basics.
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
              Intended use
              <textarea
                {...register('intendedUse')}
                className="mt-1 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="What does it do?"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Intended users
                <Input {...register('intendedUsers')} className="mt-1" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Affected persons
                <Input {...register('affectedPersons')} className="mt-1" />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Deployment
              <Input
                {...register('deploymentGeography')}
                className="mt-1"
                placeholder="Countries or region"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Lifecycle
              <Select {...register('lifecycleStage')} className="mt-1">
                <option value="UNKNOWN">Not set</option>
                <option value="DESIGN">Design</option>
                <option value="DEVELOPMENT">Development</option>
                <option value="PILOT">Pilot</option>
                <option value="PRODUCTION">Production</option>
                <option value="RETIRED">Retired</option>
              </Select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Due date{' '}
              <span className="font-normal text-slate-400">(optional)</span>
              <Input type="date" {...register('dueDate')} className="mt-1" />
            </label>
            <details className="rounded-lg border border-slate-200 px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">
                More details
              </summary>
              <div className="mt-4 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Business purpose
                  <Input {...register('businessPurpose')} className="mt-1" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Description
                  <textarea
                    {...register('description')}
                    className="mt-1 min-h-16 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Responsible owner
                  <Input {...register('responsibleOwner')} className="mt-1" />
                </label>
                <p className="text-sm font-medium text-slate-700">
                  Organization role
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['provider', 'Provider / developer'],
                    ['deployer', 'Deployer / user'],
                    ['importer', 'Importer'],
                    ['distributor', 'Distributor'],
                    ['authorized_representative', 'Authorized representative'],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        value={value}
                        {...register('operatorRoles')}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ['providerOrDeveloper', 'Provider / developer'],
                    ['deployerOrUser', 'Deployer / user'],
                    ['importer', 'Importer'],
                    ['distributor', 'Distributor'],
                    ['authorizedRepresentative', 'Authorized representative'],
                  ].map(([field, label]) => (
                    <label
                      key={field}
                      className="block text-sm font-medium text-slate-700"
                    >
                      {label}
                      <Input
                        {...register(field as keyof NewProjectFormValues)}
                        className="mt-1"
                      />
                    </label>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" {...register('generatesContent')} />
                  Generates or manipulates content
                </label>
                <fieldset>
                  <legend className="text-sm font-medium text-slate-700">
                    Use-case indicators
                  </legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {[
                      ['high_risk_context', 'High-risk context'],
                      ['prohibited_practice', 'Potential prohibited practice'],
                      ['employment', 'Employment'],
                      ['credit', 'Credit or essential service'],
                      ['biometric', 'Biometric use'],
                    ].map(([value, label]) => (
                      <label
                        key={value}
                        className="flex items-center gap-2 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          value={value}
                          {...register('useCaseIndicators')}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            </details>
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

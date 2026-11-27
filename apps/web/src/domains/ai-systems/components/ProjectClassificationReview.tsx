import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '@/app/providers/AuthContext';
import type { ProjectDetail } from '@complianx/contracts/ai-systems';
import { reviewClassification, type PreliminaryClassification } from '../api';

export function ProjectClassificationReview({
  projectId,
  project,
  result,
}: {
  projectId: string;
  project?: ProjectDetail;
  result: PreliminaryClassification;
}) {
  const { user, activeCompanyId } = useAuth();
  const client = useQueryClient();
  const [override, setOverride] = useState(false);
  const [category, setCategory] = useState('');
  const [reason, setReason] = useState('');
  const canReview =
    project?.viewerRole === 'REVIEWER' ||
    project?.viewerRole === 'APPROVER' ||
    user?.companies?.some(
      (membership) =>
        membership.companyId === activeCompanyId && membership.role === 'ADMIN',
    );
  const review = useMutation({
    mutationFn: (input: Parameters<typeof reviewClassification>[2]) =>
      reviewClassification(projectId, result.id, input),
    onSuccess: async () => {
      setOverride(false);
      await Promise.all([
        client.invalidateQueries({
          queryKey: ['preliminaryClassification', projectId, activeCompanyId],
        }),
        client.invalidateQueries({
          queryKey: ['project-workflow-summary', projectId, activeCompanyId],
        }),
      ]);
      toast.success('Classification review saved');
    },
    onError: () => toast.error('Unable to save classification review'),
  });

  if (!project || !canReview || result.reviewStatus !== 'PENDING') return null;

  function submitOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category.trim() || !reason.trim()) return;
    review.mutate({
      status: 'OVERRIDDEN',
      overrideCategory: category.trim(),
      reason: reason.trim(),
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-200 p-4">
      <h2 className="font-semibold text-slate-900">
        Record classification review
      </h2>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          className="hz-button hz-button--outline"
          disabled={review.isPending}
          onClick={() => review.mutate({ status: 'REVIEWED' })}
        >
          Mark reviewed
        </button>
        <button
          type="button"
          className="hz-button hz-button--outline"
          aria-expanded={override}
          onClick={() => setOverride(!override)}
        >
          Override result
        </button>
      </div>
      {override && (
        <form className="mt-3 grid gap-3" onSubmit={submitOverride}>
          <label>
            Classification category
            <input
              className="ml-2 rounded border border-slate-300 p-2"
              required
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </label>
          <label>
            Reason for override
            <textarea
              className="mt-1 block w-full rounded border border-slate-300 p-2"
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="hz-button hz-button--outline justify-self-start"
            disabled={review.isPending}
          >
            Save override
          </button>
        </form>
      )}
    </section>
  );
}

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/providers/AuthContext';
import {
  createRemediationAction,
  listObligationEvidence,
  listProjectFindings,
  updateProjectFinding,
  updateRemediationAction,
} from '../api';

type Finding = Awaited<ReturnType<typeof listProjectFindings>>[number];
const nextStates: Record<string, string[]> = {
  OPEN: ['ACKNOWLEDGED'],
  ACKNOWLEDGED: ['IN_REMEDIATION'],
  REOPENED: ['IN_REMEDIATION'],
  IN_REMEDIATION: ['READY_FOR_REVIEW'],
  READY_FOR_REVIEW: ['RESOLVED', 'ACCEPTED_RISK', 'IN_REMEDIATION'],
  RESOLVED: ['REOPENED'],
  ACCEPTED_RISK: ['REOPENED'],
};
export function FindingWorkflow({
  projectId,
  finding,
  canEdit,
  canReview,
}: {
  projectId: string;
  finding: Finding;
  canEdit: boolean;
  canReview: boolean;
}) {
  const { activeCompanyId } = useAuth();
  const client = useQueryClient();
  const [summary, setSummary] = useState(finding.resolutionSummary ?? '');
  const [decision, setDecision] = useState('');
  const [title, setTitle] = useState('');
  const [evidenceId, setEvidenceId] = useState('');
  const [notes, setNotes] = useState('');
  const evidence = useQuery({
    queryKey: [
      'obligation-evidence',
      projectId,
      finding.obligationId,
      activeCompanyId,
    ],
    queryFn: () => listObligationEvidence(projectId, finding.obligationId!),
    enabled: Boolean(finding.obligationId && canEdit && activeCompanyId),
  });
  const mutation = useMutation({
    mutationFn: async (command: {
      status?: string;
      actionId?: string;
      create?: boolean;
    }) => {
      if (command.create && finding.obligationId)
        return createRemediationAction(projectId, finding.obligationId, {
          title: title.trim(),
          findingId: finding.id,
        });
      if (command.actionId)
        return updateRemediationAction(projectId, command.actionId, {
          status: command.status!,
          closureEvidenceId: evidenceId || undefined,
          closureNotes: notes || undefined,
        });
      return updateProjectFinding(projectId, finding.id, {
        status: command.status,
        resolutionSummary: summary || undefined,
        reviewerDecision: ['RESOLVED', 'ACCEPTED_RISK'].includes(
          command.status ?? '',
        )
          ? decision
          : undefined,
      });
    },
    onSuccess: () => {
      setTitle('');
      void client.invalidateQueries({
        queryKey: ['findings', projectId, activeCompanyId],
      });
    },
  });
  if (!canEdit) return null;
  const closed = ['RESOLVED', 'ACCEPTED_RISK'].includes(finding.status);
  const states = (nextStates[finding.status] ?? []).filter(
    (status) => !['RESOLVED', 'ACCEPTED_RISK'].includes(status) || canReview,
  );
  return (
    <details className="w-full space-y-3">
      <summary>Manage finding</summary>
      {!closed ? (
        <>
          <label className="block">
            Resolution summary
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              className="block w-full rounded border p-2"
            />
          </label>
          {canReview && finding.status === 'READY_FOR_REVIEW' ? (
            <label className="block">
              Reviewer decision
              <textarea
                value={decision}
                onChange={(event) => setDecision(event.target.value)}
                className="block w-full rounded border p-2"
              />
            </label>
          ) : null}
          {finding.obligationId ? (
            <>
              <label className="block">
                Remediation action
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="block rounded border p-2"
                />
              </label>
              <button
                disabled={mutation.isPending || !title.trim()}
                onClick={() => mutation.mutate({ create: true })}
              >
                Add action
              </button>
              <label className="block">
                Closure evidence
                <select
                  value={evidenceId}
                  onChange={(event) => setEvidenceId(event.target.value)}
                  className="block rounded border p-2"
                >
                  <option value="">Select linked evidence</option>
                  {(evidence.data ?? [])
                    .filter((link) => link.linkType !== 'REFERENCE')
                    .map((link) => (
                      <option key={link.id} value={link.id}>
                        {link.artifact?.originalName ??
                          link.document?.type ??
                          link.id}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block">
                Closure notes
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="block w-full rounded border p-2"
                />
              </label>
              {finding.actions.map((action) => (
                <div key={action.id}>
                  {action.title} · {action.status.replaceAll('_', ' ')}{' '}
                  {!['DONE', 'COMPLETED', 'READY_FOR_REVIEW'].includes(
                    action.status,
                  ) ? (
                    <button
                      disabled={
                        mutation.isPending || !evidenceId || !notes.trim()
                      }
                      onClick={() =>
                        mutation.mutate({
                          actionId: action.id,
                          status: 'READY_FOR_REVIEW',
                        })
                      }
                    >
                      Submit action for review
                    </button>
                  ) : null}
                  {action.status === 'READY_FOR_REVIEW' && canReview ? (
                    <button
                      disabled={mutation.isPending}
                      onClick={() =>
                        mutation.mutate({
                          actionId: action.id,
                          status: 'COMPLETED',
                        })
                      }
                    >
                      Approve remediation
                    </button>
                  ) : null}
                </div>
              ))}
            </>
          ) : (
            <p>
              Associate remediation with an obligation before requesting
              closure.
            </p>
          )}
        </>
      ) : null}
      <div className="flex gap-3">
        {states.map((status) => (
          <button
            key={status}
            disabled={
              mutation.isPending ||
              (['READY_FOR_REVIEW', 'RESOLVED', 'ACCEPTED_RISK'].includes(
                status,
              ) &&
                !summary.trim()) ||
              (['RESOLVED', 'ACCEPTED_RISK'].includes(status) &&
                !decision.trim())
            }
            onClick={() => mutation.mutate({ status })}
          >
            {status.replaceAll('_', ' ')}
          </button>
        ))}
      </div>
      {mutation.isError ? (
        <p role="alert">
          Unable to save. Check the transition, required evidence, completed
          actions, and your project permissions, then retry.
        </p>
      ) : null}
      {mutation.isSuccess ? <p role="status">Finding updated.</p> : null}
    </details>
  );
}

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

const findingActionLabel = (status: string) =>
  ({
    ACKNOWLEDGED: 'Acknowledge problem',
    IN_REMEDIATION: 'Start fixing',
    READY_FOR_REVIEW: 'Ask for review',
    RESOLVED: 'Mark as fixed',
    ACCEPTED_RISK: 'Accept risk',
    REOPENED: 'Reopen problem',
  })[status] ?? status.replaceAll('_', ' ').toLowerCase();

const actionStatusLabel = (status: string) =>
  ({
    OPEN: 'Not started',
    IN_PROGRESS: 'In progress',
    READY_FOR_REVIEW: 'Waiting for review',
    COMPLETED: 'Complete',
    DONE: 'Complete',
  })[status] ?? status.replaceAll('_', ' ').toLowerCase();
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
      <summary>Manage this problem</summary>
      {!closed ? (
        <>
          <label className="block">
            How it was fixed
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              className="block w-full rounded border p-2"
            />
          </label>
          {canReview && finding.status === 'READY_FOR_REVIEW' ? (
            <label className="block">
              Reviewer’s decision
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
                Action to fix it
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
                Add a fix
              </button>
              <label className="block">
                Proof the fix worked
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
                Notes about the fix
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="block w-full rounded border p-2"
                />
              </label>
              {finding.actions.map((action) => (
                <div key={action.id}>
                  {action.title} · {actionStatusLabel(action.status)}{' '}
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
                      Ask for a review
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
                      Approve fix
                    </button>
                  ) : null}
                </div>
              ))}
            </>
          ) : (
            <p>
              Link this problem to a requirement before closing it.
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
            {findingActionLabel(status)}
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

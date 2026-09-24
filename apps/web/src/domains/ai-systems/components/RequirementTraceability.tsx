import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/providers/AuthContext';
import type { ObligationEvidenceLink } from '../api';
import { getObligationTraceability } from '../api';
import { summarizeRequirementWorkflow } from '../lib/requirement-workflow';

type Requirement = {
  id: string;
  status: string;
  approvalState: string;
  obligation: { title: string; legalReference?: string | null };
};

export function RequirementTraceability({
  projectId,
  requirement,
  evidence,
}: {
  projectId: string;
  requirement: Requirement;
  evidence: ObligationEvidenceLink[];
}) {
  const { activeCompanyId } = useAuth();
  const [open, setOpen] = useState(false);
  const trace = useQuery({
    queryKey: [
      'obligation-traceability',
      projectId,
      requirement.id,
      activeCompanyId,
    ],
    enabled: open && Boolean(activeCompanyId),
    queryFn: () => getObligationTraceability(projectId, requirement.id),
  });
  const summary = summarizeRequirementWorkflow(requirement, evidence);
  const actionHref = getActionHref(projectId, summary.action, evidence);
  const includedPackages =
    trace.data?.packageInclusion.filter((item) => item.included) ?? [];

  return (
    <>
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <Stage
          label="Requirement"
          value={
            requirement.status === 'NOT_APPLICABLE'
              ? 'Not applicable'
              : 'Applies'
          }
        />
        <Stage label="Evidence" value={summary.evidenceLabel} />
        <Stage label="Review" value={summary.reviewLabel} />
        <Stage
          label="Package"
          value={
            includedPackages.length
              ? `Included in v${includedPackages[0].version}`
              : open && trace.data
                ? 'Not included'
                : 'Check inclusion'
          }
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="text-sm font-semibold text-slate-600 hover:text-sky-700"
        >
          {open ? 'Hide details' : 'See why this matters and the proof'}
        </button>
        <Link
          to={actionHref}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
        >
          {summary.action} →
        </Link>
      </div>
      {evidence.length === 0 ? (
        <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50 p-3 text-sm text-sky-950">
          <p className="font-semibold">Suggested evidence</p>
          <p className="mt-1">{getEvidenceSuggestion(requirement.obligation.title)}</p>
        </div>
      ) : null}
      {open ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
          {trace.isLoading ? (
            <p className="text-slate-500">Loading requirement proof…</p>
          ) : null}
          {trace.isError ? (
            <p className="text-rose-600">We could not load the details.</p>
          ) : null}
          {trace.data ? (
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-slate-800">
                  What you need to do and why
                </p>
                <p className="mt-1 text-slate-600">
                  {trace.data.requirement.description ??
                    trace.data.applicability.reason ??
                    'Mapped from the current EU AI Act compliance pack.'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {trace.data.requirement.legalReference ??
                    'EU AI Act source reference unavailable'}
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-800">
                  Files and review
                </p>
                {trace.data.evidence.length ? (
                  <ul className="mt-2 space-y-2">
                    {trace.data.evidence.map((link) => (
                      <li
                        key={link.id}
                        className="rounded-lg border border-slate-200 bg-white p-3"
                      >
                        <p className="font-medium text-slate-800">
                          {link.artifact?.originalName ??
                            link.document?.type ??
                            'Linked evidence'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {link.artifact
                            ? `Version ${link.artifact.evidenceVersion} · ${link.artifact.reviewerStatus}`
                            : `Version ${link.document?.version ?? 1} · ${link.document?.approvalState ?? 'DRAFT'}`}
                          {link.artifact?.reviewer
                            ? ` · Reviewed by ${link.artifact.reviewer.email}`
                            : ''}
                          {link.artifact?.reviewedAt
                            ? ` · ${new Date(link.artifact.reviewedAt).toLocaleDateString()}`
                            : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-slate-500">No evidence linked.</p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Stage
                  label="Human approval"
                  value={
                    trace.data.review.approval?.actor
                      ? `${trace.data.review.approval.actor.email} · ${new Date(trace.data.review.approval.decidedAt).toLocaleDateString()}`
                      : trace.data.review.approvalState.replaceAll('_', ' ')
                  }
                />
                <Stage
                  label="Review package"
                  value={
                    includedPackages.length
                      ? `Included in package v${includedPackages[0].version}`
                      : 'Not included in a finalized package'
                  }
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function getEvidenceSuggestion(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes('human oversight'))
    return 'Upload a human-oversight procedure, escalation path, or operator training record.';
  if (normalized.includes('risk'))
    return 'Upload the latest risk assessment, mitigation register, or approval record.';
  if (normalized.includes('data'))
    return 'Upload a data governance policy, dataset assessment, or data-quality report.';
  if (normalized.includes('accuracy') || normalized.includes('testing'))
    return 'Upload a validation plan, evaluation report, or test results.';
  if (normalized.includes('technical documentation'))
    return 'Upload a model card, architecture note, or system design document.';
  return 'Upload a policy, process record, test result, or approval that demonstrates this requirement in practice.';
}

function Stage({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function getActionHref(
  projectId: string,
  action: string,
  evidence: ObligationEvidenceLink[],
) {
  if (action === 'Review evidence') {
    return `/projects/${projectId}/compliance-workspace`;
  }
  if (action === 'Replace evidence') {
    const artifact = evidence.find(
      (link) => link.artifact?.status === 'REJECTED',
    )?.artifact;
    return `/projects/${projectId}/evidence${artifact ? `#evidence-${artifact.id}` : ''}`;
  }
  if (action === 'Check package')
    return `/projects/${projectId}/compliance-package`;
  if (action === 'View basis') return `/projects/${projectId}/classification`;
  if (action === 'Add evidence') return `/projects/${projectId}/evidence`;
  return `/projects/${projectId}/compliance-workspace`;
}

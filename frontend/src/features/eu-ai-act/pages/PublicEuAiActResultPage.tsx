import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileText,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPublicResult } from '../api';

const DOCUMENT_LABELS: Record<string, string> = {
  ai_system_classification_memo: 'AI system classification memo',
  high_risk_ai_compliance_plan: 'High-risk AI compliance plan',
  technical_documentation_starter_pack: 'Technical documentation starter pack',
  transparency_disclosure_text: 'Transparency disclosure text',
  gpai_documentation_pack: 'GPAI documentation pack',
  nist_ai_rmf_gap_summary: 'NIST AI RMF gap summary',
  iso_42001_readiness_note: 'ISO/IEC 42001 readiness note',
  data_protection_control_checklist: 'Data protection control checklist',
  internal_governance_alignment_note: 'Internal governance alignment note',
  audit_trail_summary: 'Audit trail summary',
};

const FRAMEWORK_LABELS: Record<string, string> = {
  nist_ai_rmf: 'NIST AI RMF',
  iso_42001: 'ISO/IEC 42001',
  gdpr: 'GDPR',
  uk_ai_assurance: 'UK AI governance',
  internal_policy: 'Internal policy',
};

export default function PublicEuAiActResultPage() {
  const { resultId } = useParams<{ resultId: string }>();
  const [showDetails, setShowDetails] = useState(false);
  const resultQuery = useQuery({
    queryKey: ['publicEuAiActResult', resultId],
    enabled: Boolean(resultId),
    queryFn: () => getPublicResult(resultId!),
  });

  const result = resultQuery.data?.result;
  const compactResult =
    result?.result_kind === 'not_applicable' || result?.result_kind === 'out_of_scope';
  const showStatusBadges = Boolean(
    result &&
      (result.in_scope ||
        result.excluded ||
        result.prohibited ||
        result.high_risk ||
        result.gpai ||
        result.gpai_systemic_risk ||
        result.transparency_obligations?.length),
  );
  const showOperatorRoles = Boolean(result?.operator_roles?.length && !compactResult);
  const showDocuments = Boolean(result?.next_required_documents?.length && !compactResult);
  const showEvidenceGaps = Boolean(result?.missing_evidence?.length && !compactResult);
  const showFrameworks = Boolean(result?.other_frameworks?.length && !compactResult);
  const showTopActions = Boolean(
    result &&
      ((buildTopActions(result).length > 0 && !compactResult) ||
        result.result_kind === 'not_applicable' ||
        result.result_kind === 'out_of_scope'),
  );
  const showEvidenceSection = Boolean(result?.missing_evidence?.length && !compactResult);
  const showNeuralDocxNextStep = Boolean(
    result &&
      !compactResult &&
      (result.next_required_documents?.length ||
        result.missing_evidence?.length ||
        result.high_risk ||
        result.prohibited),
  );
  const showLegalDetails = Boolean(
    result &&
      ((result.reasoning_trace?.length ?? 0) > 0 ||
        (result.obligations?.length ?? 0) > 0 ||
        (result.next_required_documents?.length ?? 0) > 0 ||
        (resultQuery.data?.legalReferences?.length ?? 0) > 0),
  );

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.08),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Badge variant="outline" className="w-fit border-slate-300 bg-white/80 text-slate-700">
                Questionnaire Result
              </Badge>
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
                  AI Compliance Result
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  A clear answer based on the information you provided.
                </p>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-800 shadow-[0_20px_45px_-32px_rgba(120,53,15,0.25)]">
              Not legal advice.
            </div>
          </div>

          {resultQuery.isLoading ? (
            <Card className="border-slate-200/90 bg-white/95">
              <CardContent className="p-10 text-sm text-slate-500">Loading result...</CardContent>
            </Card>
          ) : resultQuery.isError || !result ? (
            <Card className="border-rose-200 bg-white/95">
              <CardContent className="p-6 text-sm text-rose-700">
                Unable to load this result right now.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-slate-200/90 bg-white/95">
                <CardHeader>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle className="text-3xl">
                        {buildVerdict(result).title}
                      </CardTitle>
                      <CardDescription className="mt-3 max-w-3xl text-sm leading-7">
                        {buildVerdict(result).description}
                      </CardDescription>
                    </div>
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4" />
                        <span>Pack {resultQuery.data.packVersion}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.18)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Result
                        </p>
                        <div className="flex items-center gap-3">
                          <div className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${buildVerdict(result).badgeClass}`}>
                            {buildVerdict(result).label}
                          </div>
                        </div>
                      </div>
                      <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        {buildVerdict(result).action}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Plain-English Explanation
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      {buildResultExplanation(result)}
                    </p>
                  </div>

                  {showStatusBadges ? (
                    <div className="flex flex-wrap gap-2">
                    {result.in_scope ? <Badge variant="success">In Scope</Badge> : <Badge variant="outline">Out of Scope</Badge>}
                    {result.excluded ? <Badge variant="warning">Excluded</Badge> : null}
                    {result.prohibited ? <Badge variant="danger">Prohibited</Badge> : null}
                    {result.high_risk ? <Badge variant="warning">High-Risk</Badge> : null}
                    {result.gpai ? <Badge variant="outline">GPAI</Badge> : null}
                    {result.gpai_systemic_risk ? <Badge variant="danger">GPAI with Systemic Risk</Badge> : null}
                    {result.transparency_obligations?.length ? <Badge variant="outline">Transparency Obligations</Badge> : null}
                    </div>
                  ) : null}
                  {showOperatorRoles || showDocuments || showEvidenceGaps ? (
                    <div className={`grid gap-4 ${showOperatorRoles && showDocuments && showEvidenceGaps ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                      {showOperatorRoles ? (
                        <ResultStat
                          label="Operator Roles"
                          
                          value={result.operator_roles?.join(', ') ?? 'Not identified'}
                        />
                      ) : null}
                      {showDocuments ? (
                        <ResultStat
                          label="Recommended Documents"
                          value={`${result.next_required_documents?.length ?? 0} recommended`}
                        />
                      ) : null}
                      {showEvidenceGaps ? (
                        <ResultStat
                          label="Open Gaps"
                          value={`${result.missing_evidence?.length ?? 0} flagged`}
                        />
                      ) : null}
                    </div>
                  ) : null}
                  {showFrameworks ? (
                    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Other Frameworks Selected
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {result.other_frameworks.map((framework) => (
                          <Badge key={framework} variant="outline">
                            {FRAMEWORK_LABELS[framework] ?? framework}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {showTopActions ? (
                    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Next Steps
                    </p>
                    <div className="mt-3 space-y-3">
                      {buildTopActions(result).map((entry) => (
                        <div key={entry} className="flex items-start gap-3 text-sm text-slate-800">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                          <span>{entry}</span>
                        </div>
                      ))}
                    </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {showEvidenceSection || showNeuralDocxNextStep ? (
                <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                {showEvidenceSection ? (
                  <Card className="border-slate-200/90 bg-white/95">
                  <CardHeader>
                    <CardTitle className="text-2xl">Missing evidence checklist</CardTitle>
                    <CardDescription>
                      These are the main items still missing or not clearly supported by your answers.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.missing_evidence?.map((entry) => (
                      <div key={entry} className="flex items-start gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <span className="text-sm text-slate-800">{entry}</span>
                      </div>
                    ))}
                  </CardContent>
                  </Card>
                ) : null}

                {showNeuralDocxNextStep ? (
                  <Card className="border-slate-200/90 bg-white/95">
                  <CardHeader>
                    <CardTitle className="text-2xl">Need Help Fixing This?</CardTitle>
                    <CardDescription>
                      NeuralDocx can help turn this result into documents, evidence, and follow-up actions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-5 py-5">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-900" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Turn this result into a working compliance plan
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button asChild className="bg-slate-950 text-white hover:bg-black">
                        <Link to="/contact">
                          Talk to NeuralDocx
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link to="/eu-ai-act-checker">Run the questionnaire again</Link>
                      </Button>
                    </div>
                  </CardContent>
                  </Card>
                ) : null}
              </div>
              ) : null}

              {showLegalDetails ? (
              <Card className="border-slate-200/90 bg-white/95">
                <CardHeader>
                  <button
                    type="button"
                    onClick={() => setShowDetails((value) => !value)}
                    className="flex w-full items-center justify-between gap-4 text-left"
                  >
                    <div>
                      <CardTitle className="text-2xl">Show Detailed Reasoning</CardTitle>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${
                        showDetails ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </CardHeader>
                {showDetails ? (
                  <CardContent className="space-y-6">
                    {showStatusBadges ? (
                    <div className="flex flex-wrap gap-2">
                      {result.in_scope ? <Badge variant="success">In Scope</Badge> : <Badge variant="outline">Out of Scope</Badge>}
                      {result.excluded ? <Badge variant="warning">Excluded</Badge> : null}
                      {result.prohibited ? <Badge variant="danger">Prohibited</Badge> : null}
                      {result.high_risk ? <Badge variant="warning">High-Risk</Badge> : null}
                      {result.gpai ? <Badge variant="outline">GPAI</Badge> : null}
                      {result.gpai_systemic_risk ? <Badge variant="danger">GPAI with Systemic Risk</Badge> : null}
                      {result.transparency_obligations?.length ? <Badge variant="outline">Transparency Obligations</Badge> : null}
                    </div>
                    ) : null}

                    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                      <div className="space-y-6">
                        {(result.reasoning_trace?.length ?? 0) > 0 ? (
                        <div>
                          <h2 className="text-xl font-semibold text-slate-950">How this result was reached</h2>
                          <div className="mt-4 space-y-4">
                            {result.reasoning_trace?.map((item) => (
                              <div
                                key={`${item.step}-${item.code}`}
                                className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                                    {item.step}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{item.summary}</p>
                                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                                      {item.code}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        ) : null}

                        {(result.obligations?.length ?? 0) > 0 ? (
                        <div>
                          <h2 className="text-xl font-semibold text-slate-950">Relevant obligations</h2>
                          <div className="mt-4 space-y-3">
                            {result.obligations.map((item, index) => (
                                <div key={`${item.role}-${index}`} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    {item.role ?? 'Assessment'}
                                  </p>
                                  <p className="mt-2 text-sm leading-6 text-slate-800">{item.title}</p>
                                </div>
                              ))}
                          </div>
                        </div>
                        ) : null}
                      </div>

                      <div className="space-y-6">
                        {(result.next_required_documents?.length ?? 0) > 0 ? (
                        <div>
                          <h2 className="text-xl font-semibold text-slate-950">Recommended documents</h2>
                          <div className="mt-4 space-y-3">
                            {result.next_required_documents?.map((documentKey) => (
                              <div key={documentKey} className="flex items-start gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" />
                                <span className="text-sm text-slate-800">
                                  {DOCUMENT_LABELS[documentKey] ?? documentKey}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        ) : null}

                        {(resultQuery.data.legalReferences?.length ?? 0) > 0 ? (
                        <div>
                          <h2 className="text-xl font-semibold text-slate-950">Legal references</h2>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {resultQuery.data.legalReferences.map((reference) => (
                                <a
                                  key={reference.id}
                                  href={reference.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                                  title={reference.title}
                                >
                                  {reference.label}
                                </a>
                              ))}
                          </div>
                        </div>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                ) : null}
              </Card>
              ) : null}
              <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 px-5 py-4 text-sm leading-7 text-slate-700 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.2)]">
                {buildClosingSummary(result)}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function buildVerdict(result: PublicResultResponse['result']) {
  if (result.result_kind === 'not_applicable') {
    return {
      label: 'Not Applicable',
      title: 'This checker does not apply here',
      description:
        'Based on your answers, this does not appear to be an AI system for the purpose of this questionnaire.',
      action: 'You do not need to continue this check unless the product changes.',
      badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
    };
  }
  if (result.result_kind === 'out_of_scope') {
    return {
      label: 'Outside Scope',
      title: 'This is outside the scope of this check',
      description:
        'Based on your answers, there is no EU use or market connection in this case.',
      action: 'Run this check again if the system is later used in the EU or placed on the EU market.',
      badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
    };
  }
  if (result.prohibited) {
    return {
      label: 'Not Yet Compliant',
      title: 'This use case likely has a serious compliance problem',
      description:
        'One of your answers matched a prohibited or clearly unacceptable use case.',
      action: 'Stop and review this use case immediately.',
      badgeClass: 'bg-rose-100 text-rose-700 border border-rose-200',
    };
  }
  if (result.high_risk || (result.missing_evidence?.length ?? 0) > 0) {
    return {
      label: 'Not Yet Compliant',
      title: 'This system likely needs more compliance work',
      description:
        'Your answers show missing controls, missing evidence, or a higher-risk use case that still needs work.',
      action: 'Fix the open gaps before treating this system as compliant.',
      badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
    };
  }
  if ((result.ambiguity_flags?.length ?? 0) > 0) {
    return {
      label: 'Needs Legal Review',
      title: 'This result needs a human review',
      description:
        'The answers do not support a clear conclusion, so someone should review this manually.',
      action: 'Do not rely on this result until the unclear points are resolved.',
      badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
    };
  }
  return {
    label: 'Likely Compliant',
    title: 'This system looks broadly compliant',
    description:
      'Based on your answers, this check did not find a major compliance problem.',
    action: 'Keep your documents current and review again when the system changes.',
    badgeClass: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  };
}

function buildTopActions(result: PublicResultResponse['result']) {
  if (result.result_kind === 'not_applicable') {
    return [
      'Confirm that this product is correctly classified.',
      'Run this questionnaire again if the product later becomes an AI system.',
    ];
  }

  if (result.result_kind === 'out_of_scope') {
    return [
      'Monitor whether the system is later used in the EU or placed on the EU market.',
      'Run the questionnaire again if your geography or customer base changes.',
    ];
  }

  if (result.prohibited) {
    return [
      'Stop rollout of the identified prohibited use case.',
      'Record why this was flagged and who owns the fix.',
      'Escalate for legal or compliance review immediately.',
    ];
  }

  const evidence = result.missing_evidence ?? [];
  if (evidence.length > 0) {
    return evidence.slice(0, 4);
  }

  if (result.high_risk) {
    return [
      'Prepare high-risk documentation and oversight controls.',
      'Confirm who owns the required evidence and controls.',
      'Prepare the recommended documents before launch.',
    ];
  }

  if ((result.ambiguity_flags?.length ?? 0) > 0) {
    return [
      'Review the flagged ambiguity with legal or compliance counsel.',
      'Clarify any unclear answers or assumptions.',
      'Run the questionnaire again after the unclear points are resolved.',
    ];
  }

  return [
    'Keep your documentation and evidence current.',
    'Run the questionnaire again if the model, purpose, or deployment context changes.',
    'Keep the recommended documents ready for review or audit.',
  ];
}

function buildResultExplanation(result: PublicResultResponse['result']) {
  if (result.summary_sentence) {
    return result.summary_sentence;
  }

  if (!result.in_scope) {
    return 'Based on the answers provided, this system does not currently appear to fall within the scope of this quick check, so no immediate compliance trigger was identified here.';
  }

  if (result.prohibited) {
    return 'Your answers point to a prohibited or clearly unacceptable use case, so this system should not be treated as compliant until that use is removed or materially changed.';
  }

  if (result.high_risk) {
    return 'Your answers point to a higher-risk AI use case, which means stronger documentation, oversight, controls, and readiness evidence are expected before this system can be treated as compliant.';
  }

  if (result.transparency_obligations?.length) {
    return 'Your answers suggest the main issue is transparency, so the focus is on making sure users are informed and the supporting documentation is in place.';
  }

  if ((result.missing_evidence?.length ?? 0) > 0) {
    return 'No major prohibited-use signal was identified, but the current evidence and control setup is not strong enough yet to support a clean compliance conclusion.';
  }

  return 'Your answers do not show a major prohibited, high-risk, or evidence-gap signal in this quick audit, so the system appears broadly aligned based on the information provided.';
}

function buildClosingSummary(result: PublicResultResponse['result']) {
  if (result.summary_sentence) {
    return `Summary: ${result.summary_sentence.replace(/\.$/, '')}.`;
  }

  const verdict = buildVerdict(result).label.toLowerCase();
  const gaps = result.missing_evidence?.length ?? 0;
  const documents = result.next_required_documents?.length ?? 0;

  if (!result.in_scope) {
    return 'Summary: this quick audit did not identify an immediate compliance issue, but you should reassess if the system, use case, or market changes.';
  }

  return `Summary: this system is ${verdict} based on the answers provided, with ${gaps} evidence gap${gaps === 1 ? '' : 's'} and ${documents} recommended follow-up document${documents === 1 ? '' : 's'}.`;
}

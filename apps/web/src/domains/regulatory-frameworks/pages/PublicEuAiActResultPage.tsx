// Regulatory frameworks public result route.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  AlertTriangle,
  ChevronDown,
  Download,
  FileText,
  Mail,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { SiteHeader } from '@/domains/marketing/components/SiteHeader';
import { buildSubmitSystemHref } from '@/domains/marketing/lib/submit-system';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { getPublicResult } from '../api';
import type { PublicResultResponse } from '../types';

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
    result?.result_kind === 'not_applicable' ||
    result?.result_kind === 'out_of_scope';
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
  const showOperatorRoles = Boolean(
    result?.operator_roles?.length && !compactResult,
  );
  const showDocuments = Boolean(
    result?.next_required_documents?.length && !compactResult,
  );
  const showEvidenceGaps = Boolean(
    result?.missing_evidence?.length && !compactResult,
  );
  const showFrameworks = Boolean(
    result?.other_frameworks?.length && !compactResult,
  );
  const showTopActions = Boolean(
    result &&
    ((buildTopActions(result).length > 0 && !compactResult) ||
      result.result_kind === 'not_applicable' ||
      result.result_kind === 'out_of_scope'),
  );
  const showEvidenceSection = Boolean(
    result?.missing_evidence?.length && !compactResult,
  );
  const showNeuralDocxNextStep = Boolean(
    result &&
    !compactResult &&
    (result.next_required_documents?.length ||
      result.missing_evidence?.length ||
      result.high_risk ||
      result.prohibited ||
      result.ambiguity_flags?.length),
  );
  const showLegalDetails = Boolean(
    result &&
    ((result.reasoning_trace?.length ?? 0) > 0 ||
      (result.obligations?.length ?? 0) > 0 ||
      (result.next_required_documents?.length ?? 0) > 0 ||
      (resultQuery.data?.legalReferences?.length ?? 0) > 0),
  );

  const handleEmailResult = () => {
    if (!result) return;
    const subject = encodeURIComponent(`NeuralDocx audit check result`);
    const body = encodeURIComponent(
      buildEmailBody(result, resultQuery.data?.packVersion),
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleDownloadPdf = async () => {
    if (!result) return;
    const pdf = new jsPDF({
      unit: 'pt',
      format: 'a4',
      compress: true,
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 48;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    try {
      const logoDataUrl = await loadImageDataUrl('/neuraldocx-logo.png');
      pdf.addImage(logoDataUrl, 'PNG', margin, y, 36, 36);
    } catch {
      pdf.setFillColor(15, 23, 42);
      pdf.roundedRect(margin, y, 36, 36, 8, 8, 'F');
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(11);
    pdf.text('NeuralDocx', margin + 48, y + 12);
    pdf.setFontSize(24);
    pdf.text('Audit Check Result', margin + 48, y + 34);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      `Pack ${resultQuery.data?.packVersion ?? 'current'}`,
      pageWidth - margin,
      y + 12,
      {
        align: 'right',
      },
    );

    y += 64;

    const ensureSpace = (height: number) => {
      if (y + height > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
    };

    const splitLines = (text: string) =>
      pdf.splitTextToSize(text, contentWidth - 32) as string[];

    const drawInfoCard = (
      title: string,
      bodyLines: string[],
      options?: { tone?: 'default' | 'accent' },
    ) => {
      const lineHeight = 16;
      const bodyHeight = Math.max(44, bodyLines.length * lineHeight + 18);
      ensureSpace(bodyHeight + 34);
      pdf.setDrawColor(226, 232, 240);
      if (options?.tone === 'accent') {
        pdf.setFillColor(240, 249, 255);
      } else {
        pdf.setFillColor(248, 250, 252);
      }
      pdf.roundedRect(margin, y, contentWidth, bodyHeight + 26, 14, 14, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text(title.toUpperCase(), margin + 16, y + 18);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      let lineY = y + 38;
      bodyLines.forEach((line) => {
        pdf.text(line, margin + 16, lineY);
        lineY += lineHeight;
      });
      y += bodyHeight + 42;
    };

    const drawSectionHeading = (title: string, subtitle?: string) => {
      const subtitleLines = subtitle
        ? (pdf.splitTextToSize(subtitle, contentWidth) as string[])
        : [];
      ensureSpace(50 + subtitleLines.length * 14);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.setTextColor(15, 23, 42);
      pdf.text(title, margin, y);
      y += 18;
      if (subtitleLines.length > 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(100, 116, 139);
        subtitleLines.forEach((line) => {
          pdf.text(line, margin, y);
          y += 13;
        });
      }
      y += 10;
    };

    const drawBulletList = (
      items: string[],
      mapper?: (item: string) => string,
    ) => {
      const normalized = items.length
        ? items
        : ['None flagged in this result.'];
      normalized.forEach((item) => {
        const text = mapper ? mapper(item) : item;
        const lines = pdf.splitTextToSize(text, contentWidth - 28) as string[];
        ensureSpace(lines.length * 15 + 8);
        pdf.setFillColor(15, 23, 42);
        pdf.circle(margin + 4, y - 4, 2, 'F');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42);
        let bulletY = y;
        lines.forEach((line) => {
          pdf.text(line, margin + 16, bulletY);
          bulletY += 15;
        });
        y = bulletY + 3;
      });
      y += 6;
    };

    const drawTwoColumnStats = (
      items: Array<{ label: string; value: string }>,
    ) => {
      const gap = 14;
      const colWidth = (contentWidth - gap) / 2;
      const top = y;
      let tallest = 0;

      items.forEach((item, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = margin + col * (colWidth + gap);
        const boxY = top + row * 86;
        const valueLines = pdf.splitTextToSize(
          item.value,
          colWidth - 24,
        ) as string[];
        const boxHeight = Math.max(68, valueLines.length * 15 + 28);
        tallest = Math.max(tallest, boxY - top + boxHeight);
        ensureSpace(tallest + 8);
        pdf.setDrawColor(226, 232, 240);
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(x, boxY, colWidth, boxHeight, 12, 12, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        pdf.text(item.label.toUpperCase(), x + 12, boxY + 16);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(15, 23, 42);
        let valueY = boxY + 36;
        valueLines.forEach((line) => {
          pdf.text(line, x + 12, valueY);
          valueY += 15;
        });
      });

      y = top + tallest + 22;
    };

    const verdict = buildVerdict(result);
    const summaryText = buildClosingSummary(result).replace(/^Summary:\s*/, '');
    const service = buildServiceRecommendation(result);
    const statusLabels = [
      result.in_scope ? 'In scope' : 'Out of scope',
      result.high_risk ? 'High-risk' : null,
      result.prohibited ? 'Prohibited' : null,
      result.transparency_obligations?.length
        ? 'Transparency obligations'
        : null,
      result.gpai ? 'GPAI' : null,
    ].filter(Boolean) as string[];

    drawInfoCard(
      'Executive Summary',
      [
        `${verdict.label}: ${verdict.title}`,
        ...splitLines(buildResultExplanation(result)),
      ],
      { tone: 'accent' },
    );

    drawTwoColumnStats([
      { label: 'Best-fit service', value: service.label },
      {
        label: 'Status',
        value: statusLabels.join(' · ') || 'No special status flags',
      },
      {
        label: 'Open gaps',
        value: `${result.missing_evidence?.length ?? 0} flagged`,
      },
      {
        label: 'Recommended documents',
        value: `${result.next_required_documents?.length ?? 0} recommended`,
      },
    ]);

    drawSectionHeading(
      'Summary',
      'This is the short reading version of the result for sharing with internal stakeholders.',
    );
    drawInfoCard('Outcome', splitLines(summaryText));

    const nextSteps = buildTopActions(result);
    if (nextSteps.length > 0 || service.summary) {
      drawSectionHeading(
        'Recommended Next Steps',
        'Use these actions to move from this result into delivery.',
      );
      drawBulletList(
        nextSteps.map((step: string, index: number) => `${index + 1}. ${step}`),
      );
      drawInfoCard('Recommended Engagement', splitLines(service.summary));
    }

    if (
      (result.missing_evidence?.length ?? 0) > 0 ||
      (result.next_required_documents?.length ?? 0) > 0
    ) {
      drawSectionHeading(
        'Documentation Readiness',
        'These are the gaps and outputs that matter most for moving forward.',
      );
      if ((result.missing_evidence?.length ?? 0) > 0) {
        drawInfoCard(
          'Missing Evidence',
          splitLines(
            'The following items are still missing or not clearly supported by your answers.',
          ),
        );
        drawBulletList(result.missing_evidence!);
      }
      if ((result.next_required_documents?.length ?? 0) > 0) {
        drawInfoCard(
          'Recommended Documents',
          splitLines(
            'These are the documents NeuralDocx would typically prepare next based on this result.',
          ),
        );
        drawBulletList(
          result.next_required_documents!,
          (key) => DOCUMENT_LABELS[key] ?? key,
        );
      }
    }

    if (
      (result.reasoning_trace?.length ?? 0) > 0 ||
      (result.obligations?.length ?? 0) > 0
    ) {
      drawSectionHeading(
        'Reasoning and Obligations',
        'This section shows the basis for the result in a more detailed format.',
      );
      if ((result.reasoning_trace?.length ?? 0) > 0) {
        drawInfoCard(
          'How This Result Was Reached',
          result.reasoning_trace!.flatMap((item) =>
            splitLines(`${item.step}. ${item.summary} (${item.code})`),
          ),
        );
      }
      if ((result.obligations?.length ?? 0) > 0) {
        drawInfoCard(
          'Relevant Obligations',
          result.obligations!.flatMap((item) =>
            splitLines(`${item.role ?? 'Assessment'}: ${item.title ?? ''}`),
          ),
        );
      }
    }

    if (
      (result.other_frameworks?.length ?? 0) > 0 ||
      (result.legal_references?.length ?? 0) > 0
    ) {
      drawSectionHeading(
        'Framework Context',
        'Additional frameworks and references selected in this check.',
      );
      if ((result.other_frameworks?.length ?? 0) > 0) {
        drawInfoCard(
          'Other Frameworks Selected',
          result.other_frameworks!.flatMap((key) =>
            splitLines(FRAMEWORK_LABELS[key] ?? key),
          ),
        );
      }
      if ((result.legal_references?.length ?? 0) > 0) {
        drawInfoCard(
          'Legal References',
          result.legal_references!.flatMap((entry) => splitLines(entry)),
        );
      }
    }

    drawSectionHeading(
      'Continue with NeuralDocx',
      'If you want us to turn this result into actual documents, use the path below.',
    );
    drawInfoCard(
      'Call to Action',
      [
        `Recommended next move: ${service.enterprise ? 'Book an enterprise demo' : 'Submit your system for a quote'}.`,
        ...splitLines(
          service.enterprise
            ? 'Use the enterprise path for higher-touch review, complex regulated environments, or unclear edge cases.'
            : 'Submit your AI system details and we will scope the right package, delivery window, and quote.',
        ),
        'neuraldocx.com/submit-system',
        'calendly.com/neuraldocx',
      ],
      { tone: 'accent' },
    );

    ensureSpace(110);
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 24;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139);
    const disclaimerLines = pdf.splitTextToSize(
      'This summary is provided by NeuralDocx to support documentation and compliance preparation. It is not legal advice.',
      contentWidth,
    ) as string[];
    disclaimerLines.forEach((line) => {
      pdf.text(line, margin, y);
      y += 13;
    });
    y += 12;
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('Prepared by NeuralDocx', margin, y);
    y += 16;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text('AI compliance documentation service', margin, y);
    y += 14;
    pdf.text(
      new Date().toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      margin,
      y,
    );

    pdf.save(`neuraldocx-audit-check-${resultId ?? 'result'}.pdf`);
  };

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.08),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Badge
                variant="outline"
                className="w-fit border-slate-300 bg-white/80 text-slate-700"
              >
                Pre-quote result
              </Badge>
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
                  Your compliance fit result
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  A clear answer, the likely service path, and the best next
                  step based on your answers.
                </p>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-800 shadow-[0_20px_45px_-32px_rgba(120,53,15,0.25)]">
              Not legal advice.
            </div>
          </div>

          {resultQuery.isLoading ? (
            <Card className="border-slate-200/90 bg-white/95">
              <CardContent className="p-10 text-sm text-slate-500">
                Loading result...
              </CardContent>
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
                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <Button
                          type="button"
                          onClick={handleDownloadPdf}
                          className="bg-slate-950 text-white hover:bg-black"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleEmailResult}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Email this result
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4" />
                        <span>Pack {resultQuery.data!.packVersion}</span>
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
                          <div
                            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${buildVerdict(result).badgeClass}`}
                          >
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
                      {result.in_scope ? (
                        <Badge variant="success">In Scope</Badge>
                      ) : (
                        <Badge variant="outline">Out of Scope</Badge>
                      )}
                      {result.excluded ? (
                        <Badge variant="warning">Excluded</Badge>
                      ) : null}
                      {result.prohibited ? (
                        <Badge variant="danger">Prohibited</Badge>
                      ) : null}
                      {result.high_risk ? (
                        <Badge variant="warning">High-Risk</Badge>
                      ) : null}
                      {result.gpai ? (
                        <Badge variant="outline">GPAI</Badge>
                      ) : null}
                      {result.gpai_systemic_risk ? (
                        <Badge variant="danger">GPAI with Systemic Risk</Badge>
                      ) : null}
                      {result.transparency_obligations?.length ? (
                        <Badge variant="outline">
                          Transparency Obligations
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                  {showOperatorRoles ||
                  showDocuments ||
                  showEvidenceGaps ||
                  !compactResult ? (
                    <div
                      className={`grid gap-4 ${showOperatorRoles && showDocuments && showEvidenceGaps ? 'md:grid-cols-4' : 'md:grid-cols-2 xl:grid-cols-4'}`}
                    >
                      {!compactResult ? (
                        <ResultStat
                          label="Best-Fit Service"
                          value={buildServiceRecommendation(result).label}
                        />
                      ) : null}
                      {showOperatorRoles ? (
                        <ResultStat
                          label="Operator Roles"

                          value={
                            result.operator_roles?.join(', ') ??
                            'Not identified'
                          }
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
                        {result.other_frameworks?.map((framework: string) => (
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
                        {buildTopActions(result).map((entry: string) => (
                          <div
                            key={entry}
                            className="flex items-start gap-3 text-sm text-slate-800"
                          >
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
                        <CardTitle className="text-2xl">
                          Missing evidence checklist
                        </CardTitle>
                        <CardDescription>
                          These are the main items still missing or not clearly
                          supported by your answers.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {result.missing_evidence?.map((entry) => (
                          <div
                            key={entry}
                            className="flex items-start gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4"
                          >
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            <span className="text-sm text-slate-800">
                              {entry}
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ) : null}

                  {showNeuralDocxNextStep ? (
                    <Card className="border-slate-200/90 bg-white/95">
                      <CardHeader>
                        <CardTitle className="text-2xl">
                          Move to the Right Service
                        </CardTitle>
                        <CardDescription>
                          Use this result to request the right package and
                          delivery path.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-5 py-5">
                          <div className="flex items-start gap-3">
                            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-900" />
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {buildServiceRecommendation(result).summary}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Button
                            asChild
                            className="bg-slate-950 text-white hover:bg-black"
                          >
                            <Link
                              to={buildSubmitSystemHref({
                                source: 'checker_result',
                              })}
                            >
                              Submit your system
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                          {buildServiceRecommendation(result).enterprise ? (
                            <Button asChild variant="outline">
                              <a
                                href="https://calendly.com/neuraldocx"
                                target="_blank"
                                rel="noreferrer"
                              >
                                Book enterprise demo
                              </a>
                            </Button>
                          ) : (
                            <Button asChild variant="outline">
                              <Link to="/eu-ai-act-checker">
                                Run the check again
                              </Link>
                            </Button>
                          )}
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
                        <CardTitle className="text-2xl">
                          Show Detailed Reasoning
                        </CardTitle>
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
                          {result.in_scope ? (
                            <Badge variant="success">In Scope</Badge>
                          ) : (
                            <Badge variant="outline">Out of Scope</Badge>
                          )}
                          {result.excluded ? (
                            <Badge variant="warning">Excluded</Badge>
                          ) : null}
                          {result.prohibited ? (
                            <Badge variant="danger">Prohibited</Badge>
                          ) : null}
                          {result.high_risk ? (
                            <Badge variant="warning">High-Risk</Badge>
                          ) : null}
                          {result.gpai ? (
                            <Badge variant="outline">GPAI</Badge>
                          ) : null}
                          {result.gpai_systemic_risk ? (
                            <Badge variant="danger">
                              GPAI with Systemic Risk
                            </Badge>
                          ) : null}
                          {result.transparency_obligations?.length ? (
                            <Badge variant="outline">
                              Transparency Obligations
                            </Badge>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-6">
                          {(result.reasoning_trace?.length ?? 0) > 0 ? (
                            <div>
                              <h2 className="text-xl font-semibold text-slate-950">
                                How this result was reached
                              </h2>
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
                                        <p className="text-sm font-semibold text-slate-900">
                                          {item.summary}
                                        </p>
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
                              <h2 className="text-xl font-semibold text-slate-950">
                                Relevant obligations
                              </h2>
                              <div className="mt-4 space-y-3">
                                {result.obligations?.map((item, index) => (
                                  <div
                                    key={`${item.role}-${index}`}
                                    className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4"
                                  >
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                      {item.role ?? 'Assessment'}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-800">
                                      {item.title}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="space-y-6">
                          {(result.next_required_documents?.length ?? 0) > 0 ? (
                            <div>
                              <h2 className="text-xl font-semibold text-slate-950">
                                Recommended documents
                              </h2>
                              <div className="mt-4 space-y-3">
                                {result.next_required_documents?.map(
                                  (documentKey) => (
                                    <div
                                      key={documentKey}
                                      className="flex items-start gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4"
                                    >
                                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" />
                                      <span className="text-sm text-slate-800">
                                        {DOCUMENT_LABELS[documentKey] ??
                                          documentKey}
                                      </span>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          ) : null}

                          {(resultQuery.data!.legalReferences?.length ?? 0) >
                          0 ? (
                            <div>
                              <h2 className="text-xl font-semibold text-slate-950">
                                Legal references
                              </h2>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {resultQuery.data!.legalReferences.map(
                                  (reference) => (
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
                                  ),
                                )}
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

function buildServiceRecommendation(result: PublicResultResponse['result']) {
  if (
    result.prohibited ||
    result.high_risk ||
    (result.ambiguity_flags?.length ?? 0) > 0
  ) {
    return {
      label: 'Enterprise',
      summary:
        'This result needs a higher-touch review, so the best next step is an enterprise scoping call before documents are quoted.',
      enterprise: true,
    };
  }

  if (
    (result.missing_evidence?.length ?? 0) > 0 ||
    (result.next_required_documents?.length ?? 0) >= 3
  ) {
    return {
      label: 'Professional',
      summary:
        'This looks like a Professional engagement: enough complexity to need structured documentation, risk analysis, and governance materials.',
      enterprise: false,
    };
  }

  return {
    label: 'Starter',
    summary:
      'This looks like a Starter engagement: a faster documentation pass with a clean compliance baseline and next-step report.',
    enterprise: false,
  };
}

function buildEmailBody(
  result: PublicResultResponse['result'],
  packVersion?: string,
) {
  const lines = [
    'NeuralDocx audit check result',
    '',
    `Verdict: ${buildVerdict(result).label}`,
    `Summary: ${buildClosingSummary(result).replace(/^Summary:\s*/, '')}`,
    '',
    'What this means:',
    buildResultExplanation(result),
  ];

  const nextSteps = buildTopActions(result);
  if (nextSteps.length > 0) {
    lines.push('', 'Next steps:');
    nextSteps.forEach((step: string, index: number) =>
      lines.push(`${index + 1}. ${step}`),
    );
  }

  if ((result.missing_evidence?.length ?? 0) > 0) {
    lines.push('', 'Open gaps:');
    result.missing_evidence!.forEach((entry: string) =>
      lines.push(`- ${entry}`),
    );
  }

  if ((result.next_required_documents?.length ?? 0) > 0) {
    lines.push('', 'Recommended documents:');
    result.next_required_documents!.forEach((key: string) =>
      lines.push(`- ${DOCUMENT_LABELS[key] ?? key}`),
    );
  }

  lines.push(
    '',
    `Pack: ${packVersion ?? 'current'}`,
    '',
    'Prepared by NeuralDocx',
    'https://neuraldocx.com',
  );

  return lines.join('\n');
}
async function loadImageDataUrl(src: string) {
  const response = await fetch(src);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read image data'));
      }
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error('Unable to read image data'));
    reader.readAsDataURL(blob);
  });
}

function buildVerdict(result: PublicResultResponse['result']) {
  if (result.result_kind === 'not_applicable') {
    return {
      label: 'Not Applicable',
      title: 'This checker does not apply here',
      description:
        'Based on your answers, this does not appear to be an AI system for the purpose of this check.',
      action:
        'You do not need to continue this check unless the product changes.',
      badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
    };
  }
  if (result.result_kind === 'out_of_scope') {
    return {
      label: 'Outside Scope',
      title: 'This is outside the scope of this check',
      description:
        'Based on your answers, there is no EU use or market connection in this case.',
      action:
        'Run this check again if the system is later used in the EU or placed on the EU market.',
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
      action:
        'Do not rely on this result until the unclear points are resolved.',
      badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
    };
  }
  return {
    label: 'Likely Compliant',
    title: 'This system looks broadly compliant',
    description:
      'Based on your answers, this check did not find a major compliance problem.',
    action:
      'Keep your documents current and review again when the system changes.',
    badgeClass: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  };
}

function buildTopActions(result: PublicResultResponse['result']) {
  if (result.result_kind === 'not_applicable') {
    return [
      'Confirm that this product is correctly classified.',
      'Run this check again if the product later becomes an AI system.',
    ];
  }

  if (result.result_kind === 'out_of_scope') {
    return [
      'Monitor whether the system is later used in the EU or placed on the EU market.',
      'Run this check again if your geography or customer base changes.',
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
      'Run this check again after the unclear points are resolved.',
    ];
  }

  return [
    'Keep your documentation and evidence current.',
    'Run this check again if the model, purpose, or deployment context changes.',
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

import { useEffect, useState } from 'react';
import { AlertCircle, FileText, Landmark, RefreshCcw, Sparkles } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { generateDemoReport } from '@/features/eu-ai-act/api';

const DEFAULT_FORM = {
  systemName: 'NorthStar Credit Decision Engine',
  companyName: 'NorthStar Bank',
  industry: 'Retail banking',
  useCase:
    'Automated loan pre-approval scoring for consumer credit applications submitted through digital banking channels in the European Union.',
  inputData:
    'Credit bureau records, declared income, employment status, repayment behaviour, fraud screening results, existing customer relationship data.',
  outputDecision:
    'Eligibility recommendation, risk score, approval routing, and escalation flag for human credit officers.',
  stakeholders:
    'Retail applicants, credit officers, compliance team, model risk team, internal audit stakeholders',
  operatorRole: 'provider',
  geography: 'European Union',
  highRiskContext: 'Access to essential services, credit, insurance, or benefits',
  oversightStatus:
    'Human review exists for borderline cases and adverse decisions, but ownership and escalation evidence are not yet fully documented.',
  controlsStatus:
    'Monitoring exists at a high level, but bias testing, control evidence, and periodic review records are incomplete.',
  documentationStatus:
    'Core system description exists, but the technical documentation pack and decision evidence repository are incomplete.',
  conformityStatus:
    'The business has not completed a formal conformity and registration readiness process for this use case.',
  notes:
    'This is a protected demo scenario used on calls to show how NeuralDocx can generate an executive-level EU AI Act compliance report from structured inputs.',
};

const DEMO_RESULT_STORAGE_KEY = 'neuraldocx_demo_eu_ai_act_report';

const DEFAULT_RESULT = {
  title: 'NorthStar Credit Decision Engine - EU AI Act Technical Documentation',
  markdown: '',
  summary:
    'Showing the default full technical-documentation preview for the prefilled loan approval AI scenario. Regenerate only when you want to refresh the report against updated demo inputs.',
  previewHtml: `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        :root {
          color-scheme: light;
          --ink: #0f172a;
          --muted: #475569;
          --border: #dbe4ee;
          --panel: #f8fafc;
          --accent: #0f172a;
          --accent-soft: #e2ecff;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: var(--ink);
          background: #eef2f7;
          padding: 32px;
        }
        .page {
          max-width: 920px;
          margin: 0 auto;
          background: white;
          border: 1px solid var(--border);
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 30px 90px -60px rgba(15, 23, 42, 0.35);
        }
        .hero {
          background: linear-gradient(135deg, #0f172a 0%, #172554 100%);
          color: white;
          padding: 40px 44px 36px;
        }
        .eyebrow {
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          opacity: 0.75;
          margin-bottom: 16px;
        }
        h1 {
          margin: 0 0 12px;
          font-size: 34px;
          line-height: 1.08;
          letter-spacing: -0.04em;
        }
        .hero p {
          margin: 0;
          max-width: 720px;
          font-size: 15px;
          line-height: 1.7;
          color: rgba(255,255,255,0.82);
        }
        .meta {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          padding: 20px 44px 0;
        }
        .meta-card {
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--panel);
          padding: 14px 16px;
        }
        .meta-card .label {
          display: block;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 6px;
        }
        .meta-card .value {
          font-size: 14px;
          line-height: 1.5;
          font-weight: 600;
        }
        .content { padding: 28px 44px 44px; }
        .toc, .callout, .section-card {
          border: 1px solid var(--border);
          border-radius: 22px;
          background: white;
          padding: 22px 24px;
          margin-bottom: 18px;
        }
        .callout { background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%); }
        h2 {
          margin: 0 0 14px;
          font-size: 24px;
          line-height: 1.2;
          letter-spacing: -0.03em;
        }
        h3 {
          margin: 18px 0 10px;
          font-size: 16px;
          line-height: 1.4;
        }
        p, li {
          font-size: 14px;
          line-height: 1.75;
          color: var(--muted);
        }
        ul { margin: 0; padding-left: 18px; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0 18px;
          font-size: 13px;
        }
        th, td {
          border: 1px solid var(--border);
          padding: 10px 12px;
          text-align: left;
          vertical-align: top;
          line-height: 1.6;
        }
        th {
          background: var(--panel);
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #475569;
        }
        .pill-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 12px 0 0;
        }
        .pill {
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          background: var(--accent-soft);
          color: #1d4ed8;
        }
        .footer {
          padding: 0 44px 36px;
          color: #64748b;
          font-size: 12px;
        }
        .section-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .toc-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          margin-top: 12px;
        }
        .toc-group {
          border: 1px solid var(--border);
          border-radius: 18px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          padding: 16px 18px;
        }
        .toc-group-title {
          margin: 0 0 10px;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #64748b;
        }
        .toc-list {
          margin: 0;
          padding-left: 18px;
        }
        .toc-list li {
          margin: 0 0 8px;
          color: var(--ink);
          font-size: 13px;
          line-height: 1.5;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="hero">
          <div class="eyebrow">NeuralDocx • EU AI Act technical documentation</div>
          <h1>NorthStar Credit Decision Engine</h1>
          <p>
            Consulting-style technical documentation preview for a high-risk retail banking loan
            approval AI deployed in the European Union. This sample is structured for executive,
            compliance, and audit review.
          </p>
        </div>
        <div class="meta">
          <div class="meta-card"><span class="label">Company</span><span class="value">NorthStar Bank</span></div>
          <div class="meta-card"><span class="label">Industry</span><span class="value">Retail banking</span></div>
          <div class="meta-card"><span class="label">Risk position</span><span class="value">Likely high-risk</span></div>
          <div class="meta-card"><span class="label">Version</span><span class="value">Demo v1.0</span></div>
        </div>
        <div class="content">
          <div class="toc">
            <h2>Table of Contents</h2>
            <div class="toc-grid">
              <div class="toc-group">
                <p class="toc-group-title">Core Report</p>
                <ol class="toc-list">
                  <li>Executive Summary</li>
                  <li>System Overview</li>
                  <li>AI Classification</li>
                  <li>Data Governance</li>
                  <li>Model Development</li>
                  <li>Risk Management</li>
                </ol>
              </div>
              <div class="toc-group">
                <p class="toc-group-title">Control Areas</p>
                <ol class="toc-list" start="7">
                  <li>Human Oversight</li>
                  <li>Transparency</li>
                  <li>Technical Robustness</li>
                  <li>Monitoring</li>
                  <li>Compliance &amp; Audit</li>
                  <li>Ethics</li>
                </ol>
              </div>
              <div class="toc-group" style="grid-column: 1 / -1;">
                <p class="toc-group-title">Close-Out</p>
                <ol class="toc-list" start="13">
                  <li>Conclusion</li>
                  <li>Appendices</li>
                </ol>
              </div>
            </div>
          </div>
          <div class="callout">
            <h2>Executive Summary</h2>
            <p>
              The NorthStar Credit Decision Engine supports automated pre-approval screening for
              consumer credit applications received through digital channels in the European Union.
              Based on the declared use case, affected persons, and impact on access to credit,
              the system should be treated as a likely high-risk AI use case under EU AI Act logic.
              The current operating model shows meaningful human review for adverse or borderline
              outcomes, but the supporting evidence base remains incomplete across model risk,
              documentation, control monitoring, and conformity-readiness.
            </p>
            <p>
              On the basis of the structured demo inputs, the current compliance posture is best
              described as partially compliant with immediate remediation needs. The main gaps relate
              to formalized technical documentation, documented model validation evidence, bias and
              performance monitoring records, and clearer ownership over high-risk governance controls.
              From a business perspective, these gaps create avoidable exposure across regulatory
              scrutiny, internal audit challenge, customer fairness concerns, and delayed approval
              for broader deployment or board-level sign-off.
            </p>
            <div class="pill-row">
              <span class="pill">High-risk context</span>
              <span class="pill">Partial control maturity</span>
              <span class="pill">Documentation gaps remain</span>
            </div>
          </div>
          <div class="section-card">
            <h2>System Overview</h2>
            <table>
              <tr><th>Component</th><th>Description</th></tr>
              <tr><td>Inputs</td><td>Credit bureau records, declared income, employment history, repayment behavior, fraud signals, and internal relationship data.</td></tr>
              <tr><td>Processing</td><td>Automated score generation, eligibility assessment, routing, escalation flagging, and operator review support.</td></tr>
              <tr><td>Outputs</td><td>Risk score, approval recommendation, and routing guidance for credit officers.</td></tr>
              <tr><td>Stakeholders</td><td>Applicants, credit officers, compliance, model risk management, and internal audit.</td></tr>
            </table>
            <ul>
              <li>The solution is positioned as a decision-support and routing engine for retail credit applications.</li>
              <li>The operating context creates direct downstream effects on access to essential financial services.</li>
              <li>The current demo scenario assumes provider-side responsibility for documentation and control design.</li>
              <li>The model consumes both external and internal data sources, making data lineage and data quality evidence central to audit readiness.</li>
              <li>The operational footprint affects applicants, first-line operators, second-line control functions, and internal audit reviewers.</li>
            </ul>
          </div>
          <div class="section-card">
            <h2>AI Classification</h2>
            <table>
              <tr><th>Category</th><th>Assessment</th></tr>
              <tr><td>Risk Level</td><td>Likely high-risk</td></tr>
              <tr><td>Use Case Category</td><td>Consumer credit and access to essential services</td></tr>
              <tr><td>Potential Harm</td><td>Unfair denial, disparate outcomes, insufficient explainability, governance failure</td></tr>
              <tr><td>Regulatory Mapping</td><td>High-risk logic tied to credit and essential-services context</td></tr>
            </table>
            <p>
              The scenario presented for demonstration purposes maps closely to a high-risk context
              because the outputs directly influence access to consumer credit. As a result, the
              technical file must evidence data governance, human oversight, control testing, and
              governance accountability at a level materially above a generic model note.
            </p>
          </div>
          <div class="section-card">
            <h2>Data Governance</h2>
            <table>
              <tr><th>Focus area</th><th>Observation</th></tr>
              <tr><td>Source lineage</td><td>External credit bureau, declared applicant data, employment status, fraud signals, and customer relationship data are all material inputs and require evidence-backed lineage mapping.</td></tr>
              <tr><td>Data quality</td><td>The current scenario implies quality checks but does not yet evidence a formal control library for completeness, timeliness, challenge resolution, or exception handling.</td></tr>
              <tr><td>Access and retention</td><td>Access-control design and retention schedules should be documented explicitly because multiple internal stakeholders consume or challenge output decisions.</td></tr>
            </table>
            <ul>
              <li>Data governance should clearly distinguish between third-party bureau data, customer-submitted data, derived features, and internal bank relationship data.</li>
              <li>A technical appendix should evidence how quality issues, stale bureau pulls, missing declarations, and inconsistent fraud signals are escalated or corrected.</li>
              <li>The documentation package should include named data owners, approved access routes, retention triggers, and evidence of change control for new data attributes.</li>
              <li>Because the use case affects credit access, the bank should maintain traceable data lineage sufficient to defend both feature provenance and downstream decision rationale.</li>
            </ul>
          </div>
          <div class="section-card">
            <h2>Model Development</h2>
            <table>
              <tr><th>Focus area</th><th>Observation</th></tr>
              <tr><td>Design rationale</td><td>The model appears intended for pre-approval and routing support rather than fully autonomous approval, which should be reflected consistently across documentation and governance approvals.</td></tr>
              <tr><td>Validation evidence</td><td>Performance evidence, bias testing, segmentation results, and release documentation are the main areas currently implied but not fully evidenced in the scenario.</td></tr>
              <tr><td>Version control</td><td>A formal model register, release log, and approval trail would materially improve audit defensibility.</td></tr>
            </table>
            <ul>
              <li>The technical file should set out model objective, feature logic, thresholds, challenge results, and validation standards in a way that can be reviewed by model risk and compliance stakeholders.</li>
              <li>Evidence should cover pre-deployment testing, periodic revalidation, segment-level fairness review, and documented approval before production release.</li>
              <li>If manual overrides are available, development records should show how override outcomes feed back into future model review and threshold calibration.</li>
            </ul>
          </div>
          <div class="section-grid">
            <div class="section-card">
              <h2>Risk Management</h2>
              <ul>
                <li>Key risks include unfair adverse outcomes, insufficient explainability for challenged decisions, weak evidence for periodic control reviews, and incomplete conformity-readiness.</li>
                <li>The current control posture suggests some operational awareness but not a fully evidenced high-risk governance framework.</li>
                <li>Residual-risk acceptance criteria should be explicitly owned by Risk and Compliance rather than inferred from business practice.</li>
                <li>A documented escalation route is needed when monitoring identifies materially different applicant outcomes or weakened model performance.</li>
              </ul>
            </div>
            <div class="section-card">
              <h2>Human Oversight</h2>
              <ul>
                <li>Human review exists for adverse or borderline outcomes, which is a meaningful control, but the threshold logic and reviewer obligations should be documented more formally.</li>
                <li>Oversight design should clarify when operators may override model recommendations, what evidence is retained, and how repeat override patterns are analyzed.</li>
                <li>Training material for credit officers should explain model boundaries, escalation steps, and prohibited forms of over-reliance.</li>
              </ul>
            </div>
          </div>
          <div class="section-grid">
            <div class="section-card">
              <h2>Transparency</h2>
              <ul>
                <li>The system should support clear internal explanations for routing and adverse-case review, together with appropriately tailored external communication where decisions materially affect applicants.</li>
                <li>The documentation should evidence what information is shared with customers, operators, compliance reviewers, and audit stakeholders.</li>
                <li>Model limitations, challenge rights, and escalation paths should be described in plain language alongside technical records.</li>
              </ul>
            </div>
            <div class="section-card">
              <h2>Technical Robustness</h2>
              <ul>
                <li>The report should capture expected performance ranges, fallback behavior, security dependencies, and incident response triggers tied to model degradation or data failures.</li>
                <li>Cybersecurity, resilience, and input-integrity considerations should be included because incorrect or manipulated inputs could create harmful downstream decisions.</li>
                <li>Robustness evidence should cover both normal operating ranges and stressed conditions such as bureau outages or degraded fraud signals.</li>
              </ul>
            </div>
          </div>
          <div class="section-grid">
            <div class="section-card">
              <h2>Monitoring</h2>
              <ul>
                <li>Ongoing monitoring should include performance drift, segmented outcomes, override patterns, incident review, and periodic challenge results.</li>
                <li>A formal review cadence should be assigned to named control owners with retained evidence for audit and committee reporting.</li>
                <li>Monitoring outputs should feed directly into risk review, control remediation, and model change governance.</li>
              </ul>
            </div>
            <div class="section-card">
              <h2>Compliance & Audit</h2>
              <ul>
                <li>The main readiness gap is not absence of all controls, but absence of a consolidated, defensible technical file that connects controls, evidence, and governance decisions.</li>
                <li>The bank should maintain a technical documentation pack, approval log, evidence index, and conformity-readiness tracker for this use case.</li>
                <li>Audit preparation should include named evidence owners, review checkpoints, and a retained rationale for key design and threshold decisions.</li>
              </ul>
            </div>
          </div>
          <div class="section-card">
            <h2>Ethics</h2>
            <ul>
              <li>Because the use case affects access to essential financial services, fairness review and proportionality assessment should be treated as core governance activities rather than optional enhancements.</li>
              <li>The governance model should evidence challenge mechanisms, impact awareness, and decision-maker accountability for applicant-facing outcomes.</li>
              <li>Any future expansion into auto-decisioning or additional data sources should trigger refreshed ethics, risk, and legal review.</li>
            </ul>
          </div>
          <div class="section-card">
            <h2>Conclusion</h2>
            <p>
              On the current facts, the NorthStar Credit Decision Engine should be treated as a
              likely high-risk AI use case with partial control maturity. The operating model is
              credible enough to support a formal technical file, but not yet sufficiently evidenced
              to claim strong audit readiness without remediation. Priority should be given to
              consolidated documentation, control evidence, monitoring records, and formal governance
              ownership. This default preview is intentionally detailed so the demo starts with a
              credible consulting-style deliverable before any live regeneration occurs.
            </p>
          </div>
          <div class="section-card">
            <h2>Appendices</h2>
            <table>
              <tr><th>Appendix</th><th>Proposed content</th></tr>
              <tr><td>Appendix A</td><td>AI system scope and intended purpose statement</td></tr>
              <tr><td>Appendix B</td><td>Input data inventory and lineage schedule</td></tr>
              <tr><td>Appendix C</td><td>Model validation and threshold-setting record</td></tr>
              <tr><td>Appendix D</td><td>Human oversight procedure and escalation guide</td></tr>
              <tr><td>Appendix E</td><td>Monitoring indicators, review cadence, and evidence index</td></tr>
              <tr><td>Appendix F</td><td>Compliance approvals, committee reporting, and audit trail summary</td></tr>
            </table>
          </div>
        </div>
        <div class="footer">
          Prepared by NeuralDocx • Demo preview for live product walkthroughs
        </div>
      </div>
    </body>
  </html>`,
};

type DemoResult = typeof DEFAULT_RESULT;

export default function EuAiActGeneratorDemoPage() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [result, setResult] = useState<DemoResult>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_RESULT;
    }
    const stored = window.localStorage.getItem(DEMO_RESULT_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_RESULT;
    }
    try {
      return JSON.parse(stored) as DemoResult;
    } catch {
      return DEFAULT_RESULT;
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(DEMO_RESULT_STORAGE_KEY, JSON.stringify(result));
  }, [result]);

  const update = (key: keyof typeof DEFAULT_FORM, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) {
      setError(null);
    }
  };

  const handleReset = () => {
    setForm(DEFAULT_FORM);
    setError(null);
  };

  const handleGenerate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const data = await generateDemoReport(form);
      setResult(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          'Unable to generate the EU AI Act demo report right now.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.07),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
                   EU AI Act report
                </h1>

              </div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white/92 px-4 py-3 text-sm text-slate-600 shadow-[0_20px_45px_-32px_rgba(15,23,42,0.18)]">
              Edit the scenario live, then regenerate only when needed.
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="space-y-6 xl:sticky xl:top-24 xl:h-fit">
              <Card className="border-slate-200/90 bg-white/95 shadow-[0_30px_80px_-56px_rgba(15,23,42,0.3)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Landmark className="h-5 w-5 text-sky-700" />
                    Client Inputs
                  </CardTitle>
                  <CardDescription>
                    Loan approval AI scenario.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field label="AI system name">
                    <Input value={form.systemName} onChange={(event) => update('systemName', event.target.value)} />
                  </Field>
                  <Field label="Company">
                    <Input value={form.companyName} onChange={(event) => update('companyName', event.target.value)} />
                  </Field>
                  <Field label="Industry">
                    <Input value={form.industry} onChange={(event) => update('industry', event.target.value)} />
                  </Field>
                  <Field label="Use case">
                    <Textarea value={form.useCase} onChange={(event) => update('useCase', event.target.value)} />
                  </Field>
                  <Field label="Input data">
                    <Textarea value={form.inputData} onChange={(event) => update('inputData', event.target.value)} />
                  </Field>
                  <Field label="Output / decision">
                    <Textarea value={form.outputDecision} onChange={(event) => update('outputDecision', event.target.value)} />
                  </Field>
                  <Field label="Affected stakeholders">
                    <Textarea value={form.stakeholders} onChange={(event) => update('stakeholders', event.target.value)} />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Operator role">
                      <Select value={form.operatorRole} onChange={(event) => update('operatorRole', event.target.value)}>
                        <option value="provider">Provider</option>
                        <option value="deployer">Deployer</option>
                        <option value="importer">Importer</option>
                        <option value="distributor">Distributor</option>
                      </Select>
                    </Field>
                    <Field label="Geography">
                      <Input value={form.geography} onChange={(event) => update('geography', event.target.value)} />
                    </Field>
                  </div>
                  <Field label="High-risk context">
                    <Select value={form.highRiskContext} onChange={(event) => update('highRiskContext', event.target.value)}>
                      <option value="Access to essential services, credit, insurance, or benefits">
                        Access to essential services, credit, insurance, or benefits
                      </option>
                      <option value="Hiring, worker management, or employment decisions">
                        Hiring, worker management, or employment decisions
                      </option>
                      <option value="Education or training decisions">
                        Education or training decisions
                      </option>
                      <option value="Law enforcement, migration, or public authority context">
                        Law enforcement, migration, or public authority context
                      </option>
                    </Select>
                  </Field>
                  <Field label="Human oversight status">
                    <Textarea value={form.oversightStatus} onChange={(event) => update('oversightStatus', event.target.value)} />
                  </Field>
                  <Field label="Risk controls status">
                    <Textarea value={form.controlsStatus} onChange={(event) => update('controlsStatus', event.target.value)} />
                  </Field>
                  <Field label="Documentation status">
                    <Textarea value={form.documentationStatus} onChange={(event) => update('documentationStatus', event.target.value)} />
                  </Field>
                  <Field label="Conformity status">
                    <Textarea value={form.conformityStatus} onChange={(event) => update('conformityStatus', event.target.value)} />
                  </Field>
                  <Field label="Demo notes">
                    <Textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} />
                  </Field>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="outline" onClick={handleReset} disabled={submitting}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Reset demo
                </Button>
                <Button type="button" onClick={handleGenerate} disabled={submitting} className="bg-slate-950 text-white hover:bg-black">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {submitting ? 'Regenerating report...' : 'Regenerate EU AI Act report'}
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {error ? (
                <Card className="border-rose-200 bg-white/95">
                  <CardContent className="flex items-start gap-3 p-5 text-sm text-rose-700">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>{error}</div>
                  </CardContent>
                </Card>
              ) : null}

              <Card className="border-slate-200/90 bg-white/95">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <FileText className="h-5 w-5 text-slate-900" />
                    Report preview
                  </CardTitle>
                  <CardDescription>
                    {result.summary}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_32px_80px_-56px_rgba(15,23,42,0.3)]">
                    <iframe
                      title="EU AI Act report preview"
                      srcDoc={result.previewHtml}
                      className="h-[2400px] w-full bg-white"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

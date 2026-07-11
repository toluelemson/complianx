import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Landmark,
  RefreshCcw,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { loadPublicQuestionPack, runQuickAssessment } from '@/features/eu-ai-act/api';
import type {
  EuAiActQuestion,
  EuAiActQuestionPack,
  EuAiActVisibilityCondition,
} from '@/features/eu-ai-act/types';

const LOAN_APPROVAL_DEMO_ANSWERS: Record<string, unknown> = {
  is_ai_system: true,
  used_in_eu: true,
  company_role: 'provider',
  other_frameworks: ['gdpr', 'internal_policy'],
  prohibited_use_cases: [],
  high_risk_contexts: ['essential_services'],
  transparency_triggers: [],
  human_oversight_ready: true,
  risk_controls_ready: false,
  documentation_ready: false,
  conformity_process_ready: false,
};

const DEMO_SCENARIO = {
  systemName: 'NorthStar Credit Decision Engine',
  company: 'NorthStar Bank',
  industry: 'Retail banking',
  useCase:
    'Automated loan pre-approval scoring for consumer credit applications across the European Union.',
  inputs: 'Credit history, declared income, employment data, repayment patterns, fraud checks.',
  outputs:
    'Eligibility recommendation, risk score, and approval routing for human credit officers.',
};

export default function LoanApprovalDemoPage() {
  const navigate = useNavigate();
  const [questionPack, setQuestionPack] = useState<EuAiActQuestionPack | null>(null);
  const [packVersion, setPackVersion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);

  useEffect(() => {
    let active = true;

    const boot = async () => {
      try {
        setLoading(true);
        setError(null);
        const created = await loadPublicQuestionPack();
        if (!active) return;
        setQuestionPack(created.questionPack);
        setPackVersion(created.packVersion);
        setAnswers(pruneHiddenAnswers(created.questionPack, LOAN_APPROVAL_DEMO_ANSWERS));
      } catch (err: any) {
        if (!active) return;
        setError(
          err?.response?.data?.message ??
            'Unable to load the live demo right now.',
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    boot();
    return () => {
      active = false;
    };
  }, []);

  const visibleSteps = useMemo(() => {
    if (!questionPack) return [];
    return questionPack.steps
      .map((step) => ({
        ...step,
        questions: step.questions.filter((question) => shouldShowQuestion(question, answers)),
      }))
      .filter((step) => step.questions.length > 0);
  }, [answers, questionPack]);

  const allRequiredSatisfied = useMemo(
    () =>
      visibleSteps.every((step) =>
        step.questions.every((question) => {
          if (!question.required) return true;
          return isQuestionAnswered(question, answers[question.key]);
        }),
      ),
    [answers, visibleSteps],
  );

  const handleAnswer = (question: EuAiActQuestion, value: unknown) => {
    const next = pruneHiddenAnswers(questionPack, { ...answers, [question.key]: value });
    setAnswers(next);
    if (error) setError(null);
    if (showRequiredErrors) {
      const hasMissing = visibleSteps.some((step) =>
        step.questions.some(
          (entry) => entry.required && !isQuestionAnswered(entry, next[entry.key]),
        ),
      );
      if (!hasMissing) {
        setShowRequiredErrors(false);
      }
    }
  };

  const handleReset = () => {
    const next = pruneHiddenAnswers(questionPack, LOAN_APPROVAL_DEMO_ANSWERS);
    setAnswers(next);
    setShowRequiredErrors(false);
    setError(null);
  };

  const handleRunDemo = async () => {
    if (!allRequiredSatisfied) {
      setShowRequiredErrors(true);
      setError('Complete the required demo fields before running the assessment.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await runQuickAssessment(answers);
      navigate(result.redirectUrl);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          'Unable to run the live demo right now.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Badge variant="outline" className="w-fit border-sky-200 bg-sky-50 text-sky-800">
                Live demo
              </Badge>
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
                  Loan approval AI demo tool
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  This page is prefilled with a realistic consumer loan approval scenario, so you can
                  walk prospects through a live compliance check in a few minutes.
                </p>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-600 shadow-[0_20px_45px_-32px_rgba(15,23,42,0.18)]">
              Editable demo. Prefilled values are ready to run.
            </div>
          </div>

          {loading ? (
            <Card className="border-slate-200/90 bg-white/95">
              <CardContent className="p-10 text-sm text-slate-500">
                Loading demo scenario...
              </CardContent>
            </Card>
          ) : error && !questionPack ? (
            <Card className="border-rose-200 bg-white/95">
              <CardContent className="flex items-start gap-3 p-6 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>{error}</div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <div className="space-y-6 xl:sticky xl:top-24 xl:h-fit">
                <Card className="border-slate-200/90 bg-white/95 shadow-[0_30px_80px_-56px_rgba(15,23,42,0.3)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Landmark className="h-5 w-5 text-sky-700" />
                      Demo scenario
                    </CardTitle>
                    <CardDescription>
                      A realistic high-risk financial-services use case.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-slate-600">
                    <ScenarioRow label="AI system" value={DEMO_SCENARIO.systemName} />
                    <ScenarioRow label="Company" value={DEMO_SCENARIO.company} />
                    <ScenarioRow label="Industry" value={DEMO_SCENARIO.industry} />
                    <ScenarioRow label="Use case" value={DEMO_SCENARIO.useCase} />
                    <ScenarioRow label="Input data" value={DEMO_SCENARIO.inputs} />
                    <ScenarioRow label="Output" value={DEMO_SCENARIO.outputs} />
                  </CardContent>
                </Card>

                <Card className="border-slate-200/90 bg-white/95">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShieldCheck className="h-5 w-5 text-emerald-700" />
                      Expected demo path
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-slate-600">
                    <p>
                      This preset is designed to show a useful “action required” result rather than a
                      blank pass/fail outcome.
                    </p>
                    <ul className="space-y-2 text-slate-700">
                      <li>High-risk context: access to credit and essential services</li>
                      <li>Strong oversight present, but documentation gaps remain</li>
                      <li>Missing conformity readiness creates a clear remediation story</li>
                    </ul>
                    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                      Pack {packVersion}
                    </div>
                  </CardContent>
                </Card>
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

                {visibleSteps.map((step, index) => (
                  <Card key={step.key} className="border-slate-200/90 bg-white/95">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                            Step {index + 1}
                          </Badge>
                          <CardTitle className="mt-3 text-2xl">{step.title}</CardTitle>
                        </div>
                        <div className="hidden rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 lg:flex lg:items-center lg:gap-2">
                          <Scale className="h-4 w-4" />
                          Prefilled
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {step.questions.map((question) => (
                        <QuestionField
                          key={question.key}
                          question={question}
                          value={answers[question.key]}
                          invalid={Boolean(
                            showRequiredErrors &&
                              question.required &&
                              !isQuestionAnswered(question, answers[question.key]),
                          )}
                          onChange={(value) => handleAnswer(question, value)}
                        />
                      ))}
                    </CardContent>
                  </Card>
                ))}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-500">
                    Use the preset as-is or change answers live to show different compliance outcomes.
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button type="button" variant="outline" onClick={handleReset} disabled={submitting}>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Reset demo values
                    </Button>
                    <Button
                      type="button"
                      onClick={handleRunDemo}
                      disabled={submitting}
                      className="bg-slate-950 text-white hover:bg-black"
                    >
                      {submitting ? 'Running demo...' : 'Run demo assessment'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ScenarioRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="leading-6 text-slate-900">{value}</p>
    </div>
  );
}

function QuestionField({
  question,
  value,
  invalid,
  onChange,
}: {
  question: EuAiActQuestion;
  value: unknown;
  invalid?: boolean;
  onChange: (value: unknown) => void;
}) {
  return (
    <div
      className={`rounded-[1.5rem] border p-5 ${
        invalid ? 'border-rose-200 bg-rose-50/60' : 'border-slate-200 bg-slate-50/70'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{question.label}</h3>
            {invalid ? (
              <Badge variant="outline" className="border-slate-200 bg-white text-slate-500">
                Required
              </Badge>
            ) : null}
          </div>
          {question.helperText ? (
            <p className="max-w-3xl text-sm leading-6 text-slate-600">{question.helperText}</p>
          ) : null}
          {invalid ? (
            <p className="text-sm font-medium text-rose-600">This field is required.</p>
          ) : null}
        </div>
        {question.legalReferenceIds?.length ? (
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {question.legalReferenceIds.join(', ')}
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {question.type === 'boolean' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[true, false].map((option) => {
              const active = value === option;
              return (
                <button
                  key={String(option)}
                  type="button"
                  onClick={() => onChange(option)}
                  className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold">{option ? 'Yes' : 'No'}</p>
                </button>
              );
            })}
          </div>
        ) : question.type === 'single' && question.options ? (
          <div className="space-y-3">
            {question.options.map((option) => {
              const active = value === option.value;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onChange(option.value)}
                  className={`w-full rounded-[1.25rem] border px-4 py-4 text-left transition ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  {option.helperText ? (
                    <p className={`mt-1 text-sm ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                      {option.helperText}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : question.type === 'multi' && question.options ? (
          <div className="space-y-3">
            {question.options.map((option) => {
              const selected = Array.isArray(value) ? value.includes(option.value) : false;
              return (
                <label
                  key={option.key}
                  className={`flex cursor-pointer items-start gap-3 rounded-[1.25rem] border px-4 py-4 transition ${
                    selected
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => {
                      const current = Array.isArray(value) ? value : [];
                      if (event.target.checked) {
                        onChange([...current, option.value]);
                      } else {
                        onChange(current.filter((entry) => entry !== option.value));
                      }
                    }}
                    className="mt-1 h-4 w-4"
                  />
                  <div>
                    <p className="text-sm font-semibold">{option.label}</p>
                    {option.helperText ? (
                      <p className={`mt-1 text-sm ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {option.helperText}
                      </p>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function pruneHiddenAnswers(
  questionPack: EuAiActQuestionPack | null,
  answers: Record<string, unknown>,
) {
  if (!questionPack) return answers;

  const nextAnswers = { ...answers };
  let changed = true;

  while (changed) {
    changed = false;
    for (const step of questionPack.steps) {
      for (const question of step.questions) {
        if (shouldShowQuestion(question, nextAnswers)) continue;
        if (question.key in nextAnswers) {
          delete nextAnswers[question.key];
          changed = true;
        }
      }
    }
  }

  return nextAnswers;
}

function shouldShowQuestion(question: EuAiActQuestion, answers: Record<string, unknown>) {
  if (!question.visibleWhen) return true;

  const allMatches =
    !question.visibleWhen.all?.length ||
    question.visibleWhen.all.every((condition) => matchesCondition(condition, answers));
  const anyMatches =
    !question.visibleWhen.any?.length ||
    question.visibleWhen.any.some((condition) => matchesCondition(condition, answers));

  return allMatches && anyMatches;
}

function matchesCondition(
  condition: EuAiActVisibilityCondition,
  answers: Record<string, unknown>,
) {
  const value = answers[condition.fact];

  if (condition.includes !== undefined) {
    return Array.isArray(value) && value.includes(condition.includes);
  }

  if (condition.equals !== undefined) {
    return value === condition.equals;
  }

  return false;
}

function isQuestionAnswered(question: EuAiActQuestion, value: unknown) {
  if (question.type === 'multi') return Array.isArray(value) && value.length > 0;
  if (question.type === 'boolean') return typeof value === 'boolean';
  if (question.type === 'text') return typeof value === 'string' && value.trim().length > 0;
  if (question.type === 'number') return typeof value === 'number';
  return value !== undefined && value !== null && value !== '';
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import { loadPublicQuestionPack } from '@/domains/regulatory-frameworks/api';
import type {
  EuAiActQuestion,
  EuAiActQuestionPack,
  EuAiActVisibilityCondition,
} from '@/domains/regulatory-frameworks/types';
import {
  createProjectAssessment,
  getPreliminaryClassification,
  listAssessmentAnswers,
  saveAssessmentAnswers,
  classifyAssessment,
  listProjectObligations,
  type PreliminaryClassification,
} from '../api';
import { summarizeOnboarding } from '../lib/onboarding-summary';
import { trackMarketingEvent } from '@/platform/analytics/marketing';

const STEP_TITLES: Record<string, string> = {
  scope: 'Where the system is used',
  roles: 'Your organization’s role',
  classification: 'How the system is used',
  gpai: 'General-purpose AI',
};

function visible(question: EuAiActQuestion, answers: Record<string, unknown>) {
  if (!question.visibleWhen) return true;
  const matches = (condition: EuAiActVisibilityCondition) =>
    condition.includes !== undefined
      ? Array.isArray(answers[condition.fact]) &&
        (answers[condition.fact] as unknown[]).includes(condition.includes)
      : answers[condition.fact] === condition.equals;
  return (
    (!question.visibleWhen.all?.length ||
      question.visibleWhen.all.every(matches)) &&
    (!question.visibleWhen.any?.length ||
      question.visibleWhen.any.some(matches))
  );
}
function answered(question: EuAiActQuestion, value: unknown) {
  return question.type === 'boolean'
    ? typeof value === 'boolean'
    : question.type === 'multi'
      ? Array.isArray(value) && value.length > 0
      : value !== undefined && value !== null && value !== '';
}

export default function ProjectQuestionnairePage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { token, initializing, activeCompanyId } = useAuth();
  const client = useQueryClient();
  const [pack, setPack] = useState<EuAiActQuestionPack | null>(null);
  const [createdAssessmentId, setCreatedAssessmentId] = useState<string | null>(
    null,
  );
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [completedClassification, setCompletedClassification] =
    useState<PreliminaryClassification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAutomatically = useRef(false);
  const classification = useQuery({
    queryKey: ['preliminaryClassification', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => getPreliminaryClassification(projectId),
  });
  const assessmentId =
    createdAssessmentId ?? classification.data?.assessmentId ?? null;
  useQuery({
    queryKey: ['assessmentAnswers', projectId, assessmentId],
    enabled: Boolean(assessmentId),
    queryFn: async () => {
      const savedAnswers = await listAssessmentAnswers(
        projectId,
        assessmentId ?? '',
      );
      setAnswers(
        Object.fromEntries(
          savedAnswers.map((answer) => [answer.questionKey, answer.valueJson]),
        ),
      );
      return savedAnswers;
    },
  });
  useEffect(() => {
    let cancelled = false;
    void loadPublicQuestionPack()
      .then((result) => {
        if (!cancelled) setPack(result.questionPack);
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load the questionnaire.');
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (
      pack &&
      classification.isFetched &&
      !classification.data &&
      !assessmentId &&
      !startedAutomatically.current
    ) {
      startedAutomatically.current = true;
      void createProjectAssessment(projectId)
        .then((assessment) => setCreatedAssessmentId(assessment.id))
        .catch(() => {
          startedAutomatically.current = false;
          setError('Unable to start the questionnaire. Reload to try again.');
        });
    }
  }, [
    assessmentId,
    classification.data,
    classification.isFetched,
    pack,
    projectId,
  ]);
  const save = useMutation({
    mutationFn: () =>
      saveAssessmentAnswers(projectId, assessmentId ?? '', answers),
    onError: () =>
      setError('Answers could not be saved. Retry before continuing.'),
  });
  const classify = useMutation({
    mutationFn: async () => {
      await save.mutateAsync();
      return classifyAssessment(projectId, assessmentId ?? '');
    },
    onSuccess: (result: PreliminaryClassification) => {
      trackMarketingEvent('classification_completed');
      setCompletedClassification(result);
      setEditing(false);
      setError(null);
      void client.invalidateQueries({
        queryKey: ['preliminaryClassification', projectId],
      });
      void client.invalidateQueries({ queryKey: ['obligations', projectId] });
    },
    onError: () =>
      setError('Classification failed. Check your answers and retry.'),
  });
  const steps = useMemo(
    () =>
      (pack?.steps ?? [])
        .map((step) => ({
          ...step,
          title: STEP_TITLES[step.key] ?? step.title,
          questions: step.questions.filter((question) =>
            visible(question, answers),
          ),
        }))
        .filter((step) => step.questions.length),
    [pack, answers],
  );
  const step = steps[stepIndex];
  const result = completedClassification ?? classification.data;
  const obligations = useQuery({
    queryKey: ['obligations', projectId, activeCompanyId],
    enabled: Boolean(result && projectId && activeCompanyId),
    queryFn: () => listProjectObligations(projectId),
  });
  const summary = result
    ? summarizeOnboarding(result, obligations.data ?? [])
    : null;
  const missing =
    step?.questions.filter(
      (question) =>
        question.required && !answered(question, answers[question.key]),
    ) ?? [];
  if (!initializing && !token) return <Navigate to="/login" replace />;
  return (
    <AppShell title="EU AI Act assessment" projectId={projectId}>
      <div className="hz-console-content space-y-6">
        <div>
          <Link
            to={`/projects/${projectId}/overview`}
            className="text-sm text-slate-500 hover:text-sky-600"
          >
            ← AI system overview
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            EU AI Act assessment
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Answer a short set of questions about your system and how your
            organization uses it. Neuraldocx will map your answers to the
            current EU AI Act rules in this workspace.
          </p>
        </div>
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            {error}
          </div>
        ) : null}
        {result && summary && !editing ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  Assessment result
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                  Here is what likely applies
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {result.resultSnapshot?.summary_sentence ??
                    'This preliminary interpretation is based on the information you provided.'}
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                Human review required
              </span>
            </div>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ResultValue label="Likely role" value={summary.role} />
              <ResultValue label="Risk category" value={summary.category} />
              <ResultValue
                label="Applicable requirements"
                value={
                  obligations.isLoading ? '—' : String(summary.requirementCount)
                }
              />
              <ResultValue
                label="Need attention"
                value={
                  obligations.isLoading ? '—' : String(summary.needsAttention)
                }
              />
            </dl>

            <div className="mt-6 grid gap-3 text-sm md:grid-cols-3">
              <Explanation
                label="Your information"
                text="The answers you supplied about the system, EU market context, and your organization’s role."
              />
              <Explanation
                label="Regulatory source"
                text={`EU AI Act content pack ${result.regulatoryContentVersion ?? 'version unavailable'} and its recorded rules.`}
              />
              <Explanation
                label="Neuraldocx interpretation"
                text="A preliminary mapping for review. It is not legal advice or a final compliance decision."
              />
            </div>

            {result.resultSnapshot?.missing_information?.length ? (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  Information still needed
                </p>
                <ul className="mt-2 space-y-1 text-sm text-amber-800">
                  {result.resultSnapshot.missing_information.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={`/projects/${projectId}#requirements`}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Continue compliance setup
              </Link>
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setStepIndex(0);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Review or update answers
              </button>
            </div>
          </section>
        ) : !assessmentId ? (
          <section className="rounded-2xl border border-sky-200 bg-sky-50 p-6">
            <p className="text-sm text-sky-900">
              Preparing your saved assessment…
            </p>
          </section>
        ) : step ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>
                Step {stepIndex + 1} of {steps.length}
              </span>
              <span>{Math.round(((stepIndex + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-sky-500"
                style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
              />
            </div>
            <h2 className="mt-6 text-xl font-semibold text-slate-900">
              {step.title}
            </h2>
            <div className="mt-5 space-y-5">
              {step.questions.map((question) => (
                <Question
                  key={question.key}
                  question={question}
                  value={answers[question.key]}
                  onChange={(value) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.key]: value,
                    }))
                  }
                />
              ))}
            </div>
            {missing.length ? (
              <p className="mt-5 text-sm text-rose-600">
                Required: {missing.map((question) => question.label).join(', ')}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  void save.mutateAsync();
                }}
                disabled={save.isPending}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {save.isPending ? 'Saving…' : 'Save progress'}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setStepIndex((index) => Math.max(0, index - 1))
                  }
                  disabled={!stepIndex}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
                  Back
                </button>
                {stepIndex < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (missing.length) return;
                      setStepIndex((index) => index + 1);
                    }}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!missing.length) classify.mutate();
                    }}
                    disabled={classify.isPending || Boolean(missing.length)}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {classify.isPending ? 'Classifying…' : 'See what applies'}
                  </button>
                )}
              </div>
            </div>
            <p className="mt-5 text-xs text-amber-700">
              Neuraldocx interprets the regulatory rules using your saved
              answers. The result remains preliminary until an authorized person
              reviews it.
            </p>
          </section>
        ) : (
          <p className="text-sm text-slate-500">Loading questionnaire…</p>
        )}
      </div>
    </AppShell>
  );
}

function ResultValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 text-lg font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function Explanation({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="mt-1 leading-5 text-slate-500">{text}</p>
    </div>
  );
}

function Question({
  question,
  value,
  onChange,
}: {
  question: EuAiActQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (question.type === 'boolean')
    return (
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>
          <span className="font-medium">{question.label}</span>
          {question.helperText ? (
            <span className="block text-xs text-slate-500">
              {question.helperText}
            </span>
          ) : null}
        </span>
      </label>
    );
  if (question.options?.length)
    return (
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">
          {question.label}
          {question.required ? ' *' : ''}
        </legend>
        <div className="mt-2 space-y-2">
          {question.options.map((option) => (
            <label
              key={option.key}
              className="flex gap-2 text-sm text-slate-700"
            >
              <input
                type={question.type === 'multi' ? 'checkbox' : 'radio'}
                name={question.key}
                checked={
                  question.type === 'multi'
                    ? Array.isArray(value) && value.includes(option.value)
                    : value === option.value
                }
                onChange={(event) =>
                  onChange(
                    question.type === 'multi'
                      ? event.target.checked
                        ? Array.from(
                            new Set([
                              ...(Array.isArray(value) ? value : []),
                              option.value,
                            ]),
                          )
                        : (Array.isArray(value) ? value : []).filter(
                            (item) => item !== option.value,
                          )
                      : option.value,
                  )
                }
              />
              {option.label}
            </label>
          ))}
        </div>
        {question.explanation ? (
          <p className="mt-1 text-xs text-slate-500">{question.explanation}</p>
        ) : null}
      </fieldset>
    );
  return (
    <label className="block text-sm font-medium text-slate-700">
      {question.label}
      {question.required ? ' *' : ''}
      <input
        type={question.type === 'number' ? 'number' : 'text'}
        value={String(value ?? '')}
        onChange={(event) =>
          onChange(
            question.type === 'number'
              ? Number(event.target.value)
              : event.target.value,
          )
        }
        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
      />
      {question.helperText ? (
        <span className="mt-1 block text-xs font-normal text-slate-500">
          {question.helperText}
        </span>
      ) : null}
    </label>
  );
}

import { useEffect, useMemo, useState } from 'react';
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
} from '../api';

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
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const classification = useQuery({
    queryKey: ['preliminaryClassification', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => getPreliminaryClassification(projectId),
  });
  const answersQuery = useQuery({
    queryKey: ['assessmentAnswers', projectId, assessmentId],
    enabled: Boolean(assessmentId),
    queryFn: () => listAssessmentAnswers(projectId, assessmentId ?? ''),
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
    if (classification.data?.assessmentId)
      setAssessmentId(classification.data.assessmentId);
  }, [classification.data?.assessmentId]);
  useEffect(() => {
    if (answersQuery.data)
      setAnswers(
        Object.fromEntries(
          answersQuery.data.map((answer) => [
            answer.questionKey,
            answer.valueJson,
          ]),
        ),
      );
  }, [answersQuery.data]);
  const start = useMutation({
    mutationFn: () => createProjectAssessment(projectId),
    onSuccess: (assessment) => setAssessmentId(assessment.id),
    onError: () => setError('Unable to start the questionnaire. Try again.'),
  });
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
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: ['preliminaryClassification', projectId],
      });
    },
    onError: () =>
      setError('Classification failed. Check your answers and retry.'),
  });
  const steps = useMemo(
    () =>
      (pack?.steps ?? [])
        .map((step) => ({
          ...step,
          questions: step.questions.filter((question) =>
            visible(question, answers),
          ),
        }))
        .filter((step) => step.questions.length),
    [pack, answers],
  );
  const step = steps[stepIndex];
  const missing =
    step?.questions.filter(
      (question) =>
        question.required && !answered(question, answers[question.key]),
    ) ?? [];
  if (!initializing && !token) return <Navigate to="/login" replace />;
  return (
    <AppShell title="Classification questionnaire" projectId={projectId}>
      <div className="hz-console-content space-y-6">
        <div>
          <Link
            to={`/projects/${projectId}/overview`}
            className="text-sm text-slate-500 hover:text-sky-600"
          >
            ← Project overview
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            {pack?.title ?? 'Classification questionnaire'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {pack?.description ??
              'Answer the questions to identify applicable obligations.'}
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
        {!assessmentId ? (
          <section className="rounded-2xl border border-sky-200 bg-sky-50 p-6">
            <p className="text-sm text-sky-900">
              Start a saved assessment to begin. Your answers will remain
              available when you return.
            </p>
            <button
              type="button"
              onClick={() => start.mutate()}
              disabled={start.isPending || !pack}
              className="mt-4 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {start.isPending ? 'Starting…' : 'Begin questionnaire'}
            </button>
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
                {save.isPending ? 'Saving…' : 'Save and return later'}
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
                    {classify.isPending
                      ? 'Classifying…'
                      : 'Review classification'}
                  </button>
                )}
              </div>
            </div>
            <p className="mt-5 text-xs text-amber-700">
              Preliminary screening only. A qualified reviewer must verify the
              result.
            </p>
          </section>
        ) : (
          <p className="text-sm text-slate-500">Loading questionnaire…</p>
        )}
      </div>
    </AppShell>
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
                onChange={() =>
                  onChange(
                    question.type === 'multi'
                      ? Array.from(
                          new Set([
                            ...(Array.isArray(value) ? value : []),
                            option.value,
                          ]),
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

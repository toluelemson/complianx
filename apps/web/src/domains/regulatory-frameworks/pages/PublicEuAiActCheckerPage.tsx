// Regulatory frameworks public checker route.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SiteHeader } from '@/domains/marketing/components/SiteHeader';
import { buildSubmitSystemHref } from '@/domains/marketing/lib/submit-system';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { loadPublicQuestionPack, runQuickAssessment } from '../api';
import type {
  EuAiActQuestion,
  EuAiActQuestionPack,
  EuAiActVisibilityCondition,
} from '../types';

export default function PublicEuAiActCheckerPage() {
  const navigate = useNavigate();
  const [questionPack, setQuestionPack] = useState<EuAiActQuestionPack | null>(
    null,
  );
  const [packVersion, setPackVersion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const answersRef = useRef<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);

  useEffect(() => {
    let active = true;

    const boot = async () => {
      try {
        setLoading(true);
        setError(null);
        const created = await loadPublicQuestionPack();
        if (!active) return;
        setPackVersion(created.packVersion);
        setQuestionPack(created.questionPack);
        setCurrentIndex(0);
      } catch (err: any) {
        if (!active) return;
        setError(
          err?.response?.data?.message ??
            'Unable to load the EU AI Act checker right now.',
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
        questions: step.questions.filter((question) =>
          shouldShowQuestion(question, answers),
        ),
      }))
      .filter((step) => step.questions.length > 0);
  }, [answers, questionPack]);

  useEffect(() => {
    if (!visibleSteps.length) {
      if (currentIndex !== 0) {
        setCurrentIndex(0);
      }
      return;
    }
    if (currentIndex > visibleSteps.length - 1) {
      setCurrentIndex(visibleSteps.length - 1);
    }
  }, [currentIndex, visibleSteps]);

  const currentStep = visibleSteps[currentIndex];
  const progress = visibleSteps.length
    ? ((currentIndex + 1) / visibleSteps.length) * 100
    : 0;

  const currentStepComplete = useMemo(() => {
    if (!currentStep) return false;
    return currentStep.questions.every((question) => {
      if (!question.required) return true;
      const value = answers[question.key];
      if (question.type === 'multi')
        return Array.isArray(value) && value.length > 0;
      if (question.type === 'boolean') return typeof value === 'boolean';
      if (question.type === 'text')
        return typeof value === 'string' && value.trim().length > 0;
      if (question.type === 'number') return typeof value === 'number';
      return value !== undefined && value !== null && value !== '';
    });
  }, [answers, currentStep]);

  const isQuestionAnswered = (question: EuAiActQuestion) => {
    const value = answers[question.key];
    if (question.type === 'multi')
      return Array.isArray(value) && value.length > 0;
    if (question.type === 'boolean') return typeof value === 'boolean';
    if (question.type === 'text')
      return typeof value === 'string' && value.trim().length > 0;
    if (question.type === 'number') return typeof value === 'number';
    return value !== undefined && value !== null && value !== '';
  };

  const handleAnswer = async (question: EuAiActQuestion, value: unknown) => {
    const rawAnswers = { ...answersRef.current, [question.key]: value };
    const nextAnswers = pruneHiddenAnswers(questionPack, rawAnswers);
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    if (showRequiredErrors && currentStep) {
      const stepIsComplete = currentStep.questions.every((entry) => {
        if (!entry.required) return true;
        const currentValue =
          entry.key === question.key ? value : nextAnswers[entry.key];
        if (entry.type === 'multi')
          return Array.isArray(currentValue) && currentValue.length > 0;
        if (entry.type === 'boolean') return typeof currentValue === 'boolean';
        if (entry.type === 'text')
          return (
            typeof currentValue === 'string' && currentValue.trim().length > 0
          );
        if (entry.type === 'number') return typeof currentValue === 'number';
        return (
          currentValue !== undefined &&
          currentValue !== null &&
          currentValue !== ''
        );
      });
      if (stepIsComplete) {
        setShowRequiredErrors(false);
      }
    }
    if (error) {
      setError(null);
    }
  };

  const handleNext = () => {
    if (!visibleSteps.length) return;
    if (!currentStepComplete) {
      setShowRequiredErrors(true);
      setError('Complete the required fields in this step.');
      return;
    }
    setShowRequiredErrors(false);
    setError(null);
    setCurrentIndex((value) => Math.min(value + 1, visibleSteps.length - 1));
  };

  const handlePrevious = () => {
    setShowRequiredErrors(false);
    setError(null);
    setCurrentIndex((value) => Math.max(value - 1, 0));
  };

  const handleFinalize = async () => {
    if (!currentStepComplete) {
      setShowRequiredErrors(true);
      setError('Complete the required fields in this step.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await runQuickAssessment(answersRef.current);
      navigate(result.redirectUrl);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          'Unable to finalize this assessment right now.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#f6f7f8] px-4 py-8 sm:px-6 lg:py-12">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
              EU AI Act readiness checker
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              Answer a few questions to identify the obligations your system may need to address.
            </p>
            <p className="mt-2 text-xs font-medium text-amber-700">
              Screening only — not legal advice.
            </p>
          </div>

          {loading ? (
            <Card className="border-slate-200/90 bg-white/95">
              <CardContent className="p-10 text-sm text-slate-500">
                Loading quick audit...
              </CardContent>
            </Card>
          ) : error && !questionPack ? (
            <Card className="border-rose-200 bg-white/95">
              <CardContent className="flex items-start gap-3 p-6 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>{error}</div>
              </CardContent>
            </Card>
          ) : questionPack && currentStep ? (
            <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
              <Card className="border-slate-200/90 bg-white/95 xl:sticky xl:top-24 xl:h-fit">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-lg">Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <span>Completion</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#d40c2e] transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {visibleSteps.map((step, index) => {
                      const active = index === currentIndex;
                      const complete = index < currentIndex;
                      return (
                        <button
                          key={step.key}
                          type="button"
                          onClick={() => setCurrentIndex(index)}
                          className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                            active
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : complete
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {complete ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-semibold">
                                  {index + 1}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">
                                {step.title}
                              </p>
                              <p
                                className={`mt-1 text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}
                              >
                                {step.questions.length} question
                                {step.questions.length === 1 ? '' : 's'}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                {error ? (
                  <Card className="border-rose-200 bg-white/95">
                    <CardContent className="flex items-start gap-3 p-5 text-sm text-rose-700">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>{error}</div>
                    </CardContent>
                  </Card>
                ) : null}

                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Step {currentIndex + 1} of {visibleSteps.length}
                    </p>
                    <CardTitle className="mt-2 text-2xl">
                      {currentStep.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {currentStep.questions.map((question) => (
                      <QuestionField
                        key={question.key}
                        question={question}
                        value={answers[question.key]}
                        invalid={Boolean(
                          showRequiredErrors &&
                          question.required &&
                          !isQuestionAnswered(question),
                        )}
                        onChange={(value) => handleAnswer(question, value)}
                      />
                    ))}
                  </CardContent>
                </Card>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-500">
                    {packVersion ? `Assessment version ${packVersion}` : null}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={currentIndex === 0 || submitting}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                    {currentIndex < visibleSteps.length - 1 ? (
                      <Button
                        type="button"
                        onClick={handleNext}
                        disabled={submitting}
                        className="bg-[#d40c2e] text-white hover:bg-[#e21236]"
                      >
                        Continue
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleFinalize}
                        disabled={submitting}
                        className="bg-[#d40c2e] text-white hover:bg-[#e21236]"
                      >
                        {submitting ? 'Preparing...' : 'View assessment'}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="text-center text-sm text-slate-500">
                  <Link
                    to={buildSubmitSystemHref({ source: 'checker_skip' })}
                    className="font-medium text-slate-700 transition-colors hover:text-slate-950"
                  >
                    Continue without screening
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </>
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
      className={`rounded-lg border p-4 sm:p-5 ${
        invalid
          ? 'border-rose-200 bg-rose-50/60'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">
              {question.label}
            </h3>
            {invalid ? (
              <span className="text-xs font-semibold text-rose-600">Required</span>
            ) : null}
          </div>
          {question.helperText ? (
            <p className="max-w-3xl text-xs leading-5 text-slate-500 sm:text-sm">
              {question.helperText}
            </p>
          ) : null}
          {invalid ? (
            <p className="text-sm font-medium text-rose-600">
              This field is required.
            </p>
          ) : null}
        </div>
        {question.legalReferenceIds?.length ? (
          <div className="shrink-0 text-xs font-medium text-slate-400">
            {question.legalReferenceIds.join(', ')}
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        {question.type === 'boolean' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[true, false].map((option) => {
              const active = value === option;
              return (
                <button
                  key={String(option)}
                  type="button"
                  onClick={() => onChange(option)}
                    className={`rounded-md border px-3 py-3 text-left transition ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold">
                    {option ? 'Yes' : 'No'}
                  </p>
                </button>
              );
            })}
          </div>
        ) : question.type === 'single' && question.options ? (
            <div className="space-y-2">
            {question.options.map((option) => {
              const active = value === option.value;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onChange(option.value)}
                  className={`w-full rounded-md border px-3 py-3 text-left transition ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  {option.helperText ? (
                    <p
                        className={`mt-1 text-xs leading-5 ${active ? 'text-slate-300' : 'text-slate-500'}`}
                    >
                      {option.helperText}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : question.type === 'multi' && question.options ? (
            <div className="space-y-2">
            {question.options.map((option) => {
              const selected = Array.isArray(value)
                ? value.includes(option.value)
                : false;
              return (
                <label
                  key={option.key}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 transition ${
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
                        onChange(
                          current.filter((entry) => entry !== option.value),
                        );
                      }
                    }}
                    className="mt-1 h-4 w-4"
                  />
                  <div>
                    <p className="text-sm font-semibold">{option.label}</p>
                    {option.helperText ? (
                      <p
                        className={`mt-1 text-xs leading-5 ${selected ? 'text-slate-300' : 'text-slate-500'}`}
                      >
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

function shouldShowQuestion(
  question: EuAiActQuestion,
  answers: Record<string, unknown>,
) {
  if (!question.visibleWhen) return true;

  const allMatches =
    !question.visibleWhen.all?.length ||
    question.visibleWhen.all.every((condition) =>
      matchesCondition(condition, answers),
    );
  const anyMatches =
    !question.visibleWhen.any?.length ||
    question.visibleWhen.any.some((condition) =>
      matchesCondition(condition, answers),
    );

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

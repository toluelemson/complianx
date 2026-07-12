// AI systems domain route.
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import api from '@/platform/api/client';
import { SiteHeader } from '@/domains/marketing/components/SiteHeader';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { useSearchParams } from 'react-router-dom';
import { trackMarketingEvent } from '@/platform/analytics/marketing';
import type {
  SubmitSystemPackageInterest,
  SubmitSystemSource,
} from '@/domains/marketing/lib/submit-system';

interface SubmitSystemFormValues {
  name: string;
  email: string;
  company?: string;
  aiSystemName: string;
  packageInterest: string;
  useCase: string;
  dataUsed: string;
  timeline: string;
}

const SUBMIT_SYSTEM_CONTEXT: Partial<
  Record<
    SubmitSystemSource,
    {
      eyebrow: string;
      title: string;
      description: string;
      timelineLabel: string;
    }
  >
> = {
  checker_result: {
    eyebrow: 'Recommended next step',
    title: 'Turn this compliance result into a scoped delivery',
    description:
      'We will use your checker result as context and match you to the right documentation package, delivery window, and support path.',
    timelineLabel: 'Best first response: 48 hours',
  },
  checker_skip: {
    eyebrow: 'Direct intake',
    title: 'Skip the checker and send the system directly',
    description:
      'Share the system details once and we will scope the right package, quote, and delivery path without requiring the self-assessment first.',
    timelineLabel: 'Best first response: 48 hours',
  },
  pricing_enterprise: {
    eyebrow: 'Enterprise intake',
    title: 'Tell us about the regulated AI program',
    description:
      'Share the system details and delivery constraints so we can scope an enterprise workstream, governance alignment, and review path.',
    timelineLabel: 'Best first response: same business day',
  },
  pricing_professional: {
    eyebrow: 'Professional package intake',
    title: 'Tell us about the system that needs deeper review',
    description:
      'We will use this intake to scope the deeper risk, controls, and governance documentation pack your team likely needs.',
    timelineLabel: 'Best first response: 48 hours',
  },
  trial_modal_exit: {
    eyebrow: 'Fastest next step',
    title: 'Share the system and we will scope the first pack',
    description:
      'You do not need to adopt a platform first. Submit the system details and we will map the right package, timing, and next actions.',
    timelineLabel: 'Best first response: 48 hours',
  },
  trial_modal_scroll: {
    eyebrow: 'Ready to move forward?',
    title: 'Tell us about the system you want documented',
    description:
      'Use this short intake to start the documentation workstream without a long implementation step.',
    timelineLabel: 'Best first response: 48 hours',
  },
  trial_modal_video: {
    eyebrow: 'From the walkthrough',
    title: 'Share the AI system behind the workflow you just saw',
    description:
      'If the walkthrough looked close to your use case, send the system details and we will scope the first documentation pack for you.',
    timelineLabel: 'Best first response: 48 hours',
  },
};

export default function SubmitSystemPage() {
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [searchParams] = useSearchParams();
  const source =
    (searchParams.get('source') as SubmitSystemSource | null) ?? undefined;
  const packageFromQuery =
    (searchParams.get('package') as SubmitSystemPackageInterest | null) ??
    undefined;
  const pageContext = useMemo(
    () =>
      (source && SUBMIT_SYSTEM_CONTEXT[source]) ?? {
        eyebrow: 'Submit your system',
        title: 'Tell us about your AI system',
        description:
          'Share the key details and we will match you to the right service package, delivery window, and quote.',
        timelineLabel: 'Best first response: 48 hours',
      },
    [source],
  );
  const { register, handleSubmit, reset } = useForm<SubmitSystemFormValues>({
    defaultValues: {
      name: '',
      email: '',
      company: '',
      aiSystemName: '',
      packageInterest: packageFromQuery ?? 'starter',
      useCase: '',
      dataUsed: '',
      timeline: '48_hours',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: SubmitSystemFormValues) =>
      api
        .post('/contact', {
          name: values.name,
          email: values.email,
          company: values.company,
          message: [
            'Submit your system request',
            '',
            `Lead source: ${source ?? 'direct'}`,
            `Package interest: ${values.packageInterest}`,
            `AI system name: ${values.aiSystemName}`,
            `Use case / product flow: ${values.useCase}`,
            `Data used: ${values.dataUsed}`,
            `Desired timeline: ${values.timeline}`,
          ].join('\n'),
        })
        .then((res) => res.data),
    onSuccess: () => {
      setStatusMessage(
        "Thanks. We've received your system and will get back to you shortly.",
      );
      reset();
    },
    onError: (err: any) => {
      setStatusMessage(
        err?.response?.data?.message ??
          'Unable to submit your system right now. Please try again later.',
      );
    },
  });

  useEffect(() => {
    reset((currentValues) => ({
      ...currentValues,
      packageInterest: packageFromQuery ?? currentValues.packageInterest,
    }));
  }, [packageFromQuery, reset]);

  useEffect(() => {
    trackMarketingEvent('marketing_submit_page_viewed', {
      package_interest: packageFromQuery ?? null,
      source: source ?? 'direct',
    });
  }, [packageFromQuery, source]);

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.08),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">
              {pageContext.eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {pageContext.title}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-500">
              {pageContext.description}
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              {pageContext.timelineLabel}.{' '}
              Larger or more regulated deployment?{' '}
              <a
                href="https://calendly.com/neuraldocx"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-slate-700 transition hover:text-slate-950"
              >
                Book an enterprise demo
              </a>
              .
            </p>
          </div>

          <Card className="mt-10 rounded-[1.75rem] border-slate-200/90 bg-white/95 shadow-[0_35px_100px_-40px_rgba(15,23,42,0.2)]">
            <CardContent className="p-8 sm:p-10">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Step 1
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    Submit your system
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Step 2
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    Get a quote
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Step 3
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    Receive documents
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Starter
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    EUR500 - EUR1,500
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    2-4 day turnaround
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Professional
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    EUR2,000 - EUR5,000
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Most common engagement
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Enterprise
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    EUR8,000 - EUR20,000+
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Custom scope</p>
                </div>
              </div>

              <form
                className="mt-8 space-y-5"
                onSubmit={handleSubmit((values) => {
                  trackMarketingEvent('marketing_submit_form_submitted', {
                    package_interest: values.packageInterest,
                    source: source ?? 'direct',
                  });
                  mutation.mutate(values);
                })}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Name
                    <Input
                      type="text"
                      {...register('name', { required: true })}
                      className="mt-2"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Email
                    <Input
                      type="email"
                      {...register('email', { required: true })}
                      className="mt-2"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Company
                    <Input
                      type="text"
                      {...register('company')}
                      className="mt-2"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    AI system name
                    <Input
                      type="text"
                      {...register('aiSystemName', { required: true })}
                      className="mt-2"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Package interest
                    <Select
                      {...register('packageInterest', { required: true })}
                      className="mt-2"
                    >
                      <option value="starter">Starter</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                      <option value="not_sure">Not sure yet</option>
                    </Select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Delivery target
                    <Select
                      {...register('timeline', { required: true })}
                      className="mt-2"
                    >
                      <option value="24_hours">24 hours</option>
                      <option value="48_hours">48 hours</option>
                      <option value="72_hours">72 hours</option>
                      <option value="this_week">This week</option>
                      <option value="flexible">Flexible</option>
                    </Select>
                  </label>
                </div>

                <label className="block text-sm font-medium text-slate-700">
                  Use case / product flow
                  <Textarea
                    rows={4}
                    {...register('useCase', { required: true })}
                    className="mt-2 min-h-[140px]"
                    placeholder="What does the system do and how is it used?"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Data used
                  <Textarea
                    rows={4}
                    {...register('dataUsed', { required: true })}
                    className="mt-2 min-h-[140px]"
                    placeholder="What data sources or inputs does the system rely on?"
                  />
                </label>

                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="rounded-full bg-slate-950 px-6 text-white hover:bg-black"
                >
                  {mutation.isPending ? 'Submitting...' : 'Get my quote'}
                </Button>

                {statusMessage ? (
                  <p className="text-sm text-slate-500">{statusMessage}</p>
                ) : null}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

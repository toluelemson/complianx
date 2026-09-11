import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/platform/api/client';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function BillingModal({ isOpen, onClose }: Props) {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const planQuery = useQuery({
    queryKey: ['billing', 'plan'],
    enabled: isOpen,
    queryFn: () => api.get('/billing/plan').then((r) => r.data),
  });
  const usageQuery = useQuery({
    queryKey: ['billing', 'usage'],
    enabled: isOpen,
    queryFn: () => api.get('/billing/usage').then((r) => r.data),
  });

  const checkoutMutation = useMutation({
    mutationFn: (payload: { plan: 'PRO' | 'ENTERPRISE' }) =>
      api.post('/billing/checkout', payload).then((r) => r.data),
    onSuccess: (data) => {
      setStatusMessage(data?.message ?? null);
      if (data?.url) {
        window.location.href = data.url;
      }
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => api.post('/billing/portal').then((r) => r.data),
    onSuccess: (data) => {
      setStatusMessage(data?.message ?? null);
      if (data?.url) {
        window.location.href = data.url;
      }
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    planQuery.refetch();
    usageQuery.refetch();
  }, [isOpen, planQuery, usageQuery]);

  if (!isOpen) return null;
  const plan = planQuery.data?.plan ?? 'FREE';
  const limits = planQuery.data?.limits ?? { docs: 0, trust: 0, reviews: 0 };
  const usage = usageQuery.data ?? {
    month: '',
    docsGenerated: 0,
    trustAnalyses: 0,
    reviewsLogged: 0,
  };
  const isPaidPlan = plan !== 'FREE';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Card
        className="max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[1.25rem] border-slate-200/90 bg-white shadow-[0_35px_100px_-40px_rgba(15,23,42,0.45)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-dialog-title"
      >
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                id="billing-dialog-title"
                className="text-lg font-semibold tracking-[-0.02em] text-slate-900"
              >
                Billing overview
              </h2>
              <p className="mt-1 text-sm text-slate-500">Plan and usage</p>
            </div>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 text-slate-600"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Close
            </Button>
          </div>
          {planQuery.isPending || usageQuery.isPending ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              Loading billing details…
            </div>
          ) : planQuery.isError || usageQuery.isError ? (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
              Billing details are temporarily unavailable. Please try again.
              <Button
                onClick={() => {
                  void planQuery.refetch();
                  void usageQuery.refetch();
                }}
                variant="outline"
                size="sm"
                className="mt-3 border-rose-300 bg-white text-rose-700"
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Current plan
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {plan}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600">
                  <div>
                    <dt className="text-slate-400">Documents</dt>
                    <dd className="font-semibold text-slate-800">
                      {formatLimit(limits.docs)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Analyses</dt>
                    <dd className="font-semibold text-slate-800">
                      {formatLimit(limits.trust)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Reviews</dt>
                    <dd className="font-semibold text-slate-800">
                      {formatLimit(limits.reviews)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">AI systems</dt>
                    <dd className="font-semibold text-slate-800">
                      {formatLimit(limits.activeAiSystems)}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Usage ({usage.month || 'this month'})
                </p>
                <dl className="mt-3 space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between gap-4">
                    <dt>Documents generated</dt>
                    <dd className="font-semibold text-slate-900">
                      {usage.docsGenerated}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Trust analyses</dt>
                    <dd className="font-semibold text-slate-900">
                      {usage.trustAnalyses}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Reviews logged</dt>
                    <dd className="font-semibold text-slate-900">
                      {usage.reviewsLogged}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {isPaidPlan ? 'Manage your plan' : 'Unlock more capacity'}
                </p>
                <p className="text-xs text-slate-500">
                  {isPaidPlan
                    ? 'Update payment or subscription settings.'
                    : 'Upgrade when your team is ready.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isPaidPlan ? (
                <Button
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                  variant="outline"
                  size="sm"
                >
                  {portalMutation.isPending
                    ? 'Opening portal…'
                    : 'Manage subscription'}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => checkoutMutation.mutate({ plan: 'PRO' })}
                    disabled={checkoutMutation.isPending}
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-[#e21236]"
                  >
                    {checkoutMutation.isPending
                      ? 'Redirecting…'
                      : 'Upgrade to Pro'}
                  </Button>
                  <Button
                    onClick={() =>
                      checkoutMutation.mutate({ plan: 'ENTERPRISE' })
                    }
                    disabled={checkoutMutation.isPending}
                    variant="outline"
                    size="sm"
                  >
                    Talk to sales
                  </Button>
                </>
              )}
            </div>
            {statusMessage && (
              <p className="mt-3 text-xs text-slate-500">{statusMessage}</p>
            )}
            {(checkoutMutation.isError || portalMutation.isError) && (
              <p className="mt-2 text-xs text-rose-500">
                Unable to contact billing service. Please try again.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatLimit(value?: number) {
  if (value === Number.MAX_SAFE_INTEGER) return 'Unlimited';
  return value ?? '—';
}

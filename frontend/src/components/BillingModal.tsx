import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../api/client';

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
  const usage =
    usageQuery.data ?? { month: '', docsGenerated: 0, trustAnalyses: 0, reviewsLogged: 0 };
  const isPaidPlan = plan !== 'FREE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-2">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-slate-900">Billing overview</p>
              <p className="text-sm text-slate-500">
                Review your current limits and manage your subscription in one place.
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
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
            </button>
          </div>
        <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Current plan
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900">{plan}</p>
            <p className="mt-2 text-slate-600">
              Monthly limits · Documents:{' '}
              {limits.docs === Number.MAX_SAFE_INTEGER ? 'Unlimited' : limits.docs} · Analyses:{' '}
              {limits.trust === Number.MAX_SAFE_INTEGER ? 'Unlimited' : limits.trust} · Reviews:{' '}
              {limits.reviews === Number.MAX_SAFE_INTEGER ? 'Unlimited' : limits.reviews}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Usage ({usage.month || 'this month'})
            </p>
            <p className="mt-2 text-slate-600">
              Documents generated:{' '}
              <span className="font-semibold text-slate-900">{usage.docsGenerated}</span>
            </p>
            <p className="text-slate-600">
              Trust analyses:{' '}
              <span className="font-semibold text-slate-900">{usage.trustAnalyses}</span>
            </p>
            <p className="text-slate-600">
              Reviews logged:{' '}
              <span className="font-semibold text-slate-900">{usage.reviewsLogged}</span>
            </p>
          </div>
        </div>
        <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Actions</p>
              <p className="text-xs text-slate-500">
                Choose the option that best fits your next step.
              </p>
            </div>
            <div className="hidden flex-wrap items-center gap-3 lg:flex">
              <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600">
                Pro features
              </div>
              <div className="text-[11px] text-slate-500">
                Unlimited documents, advanced review controls, and priority support.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isPaidPlan ? (
                <button
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-60"
                >
                  {portalMutation.isPending ? 'Opening portal…' : 'Manage subscription'}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => checkoutMutation.mutate({ plan: 'PRO' })}
                    disabled={checkoutMutation.isPending}
                    className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
                  >
                    {checkoutMutation.isPending ? 'Redirecting…' : 'Upgrade to Pro'}
                  </button>
                  <button
                    onClick={() => checkoutMutation.mutate({ plan: 'ENTERPRISE' })}
                    disabled={checkoutMutation.isPending}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-60"
                  >
                    Talk to sales
                  </button>
                </>
              )}
            </div>
          </div>
          {statusMessage && (
            <p className="mt-3 text-xs text-slate-500">{statusMessage}</p>
          )}
          {(checkoutMutation.isError || portalMutation.isError) && (
            <p className="mt-2 text-xs text-rose-500">
              Unable to contact billing service. Please try again.
            </p>
          )}
          <div className="mt-4 space-y-2 rounded-lg border border-dashed border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600">
            <p className="font-semibold text-slate-900">Pro unlocks</p>
            <p className="text-[11px] text-slate-500">
              Upgrade for unlimited document exports, collaborative review workflows, and faster support response.
            </p>
            <ul className="space-y-1 text-[11px] text-slate-600">
              <li>• Unlimited AI documentation generation</li>
              <li>• Multi-reviewer workflows with role-based approvals</li>
              <li>• Priority support and roadmap previews</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

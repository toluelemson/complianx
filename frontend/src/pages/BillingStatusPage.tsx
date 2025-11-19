import { useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../components/AppShell';

interface BillingStatusPageProps {
  variant: 'success' | 'cancel';
}

const iconStyles = 'h-12 w-12 flex items-center justify-center rounded-full border';

export default function BillingStatusPage({ variant }: BillingStatusPageProps) {
  const isSuccess = variant === 'success';
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isSuccess) {
      queryClient.invalidateQueries({ queryKey: ['billing', 'plan'] });
      queryClient.invalidateQueries({ queryKey: ['billing', 'usage'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
    }
  }, [isSuccess, queryClient]);

  const content = useMemo(
    () =>
      isSuccess
        ? {
            title: 'Payment successful',
            description:
              'Thanks for upgrading! Your subscription is now active. If you do not see the new features immediately, wait a few seconds for the webhook update or refresh the page.',
            iconColor: 'border-emerald-200 bg-emerald-50 text-emerald-600',
            hint: sessionId
              ? `Stripe session ID: ${sessionId}`
              : 'We will email a receipt shortly.',
          }
        : {
            title: 'Checkout canceled',
            description:
              'No worries—your card has not been charged. You can restart the upgrade whenever you are ready.',
            iconColor: 'border-amber-200 bg-amber-50 text-amber-600',
            hint: 'Need help? Contact support or try the checkout again.',
          },
    [isSuccess, sessionId],
  );

  return (
    <AppShell title="Billing">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className={`${iconStyles} mx-auto ${content.iconColor}`}>
          {isSuccess ? '✓' : '!'}
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-slate-900">{content.title}</h2>
        <p className="mt-2 text-sm text-slate-600">{content.description}</p>
        <p className="mt-4 text-xs text-slate-500">{content.hint}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/dashboard"
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to dashboard
          </Link>
          {isSuccess ? (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('paywall'))}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
            >
              Manage billing
            </button>
          ) : (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('paywall'))}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
            >
              Retry checkout
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

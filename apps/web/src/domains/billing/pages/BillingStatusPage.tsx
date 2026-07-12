// Billing domain route.
import { useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/app/layout/AppShell';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';

interface BillingStatusPageProps {
  variant: 'success' | 'cancel';
}

const iconStyles =
  'h-12 w-12 flex items-center justify-center rounded-full border';

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
      <Card className="mx-auto max-w-2xl rounded-2xl border-slate-200/90 bg-white/90 text-center shadow-[0_20px_45px_-32px_rgba(15,23,42,0.3)]">
        <CardContent className="p-8">
          <div className={`${iconStyles} mx-auto ${content.iconColor}`}>
            {isSuccess ? '✓' : '!'}
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900">
            {content.title}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{content.description}</p>
          <p className="mt-4 text-xs text-slate-500">{content.hint}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline">
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
            {isSuccess ? (
              <Button
                type="button"
                onClick={() => window.dispatchEvent(new Event('paywall'))}
                className="bg-slate-950 text-white hover:bg-black"
              >
                Manage billing
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => window.dispatchEvent(new Event('paywall'))}
                className="bg-slate-950 text-white hover:bg-black"
              >
                Retry checkout
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}

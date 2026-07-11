import { useEffect } from 'react';
import { AppShell } from '../components/AppShell';

export default function BillingLandingPage() {
  useEffect(() => {
    window.dispatchEvent(new Event('paywall'));
  }, []);

  return (
    <AppShell title="Billing">
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-lg font-semibold text-slate-900">Opening billing settings…</p>
        <p className="text-sm text-slate-500">
          We redirect you to the billing modal automatically. If nothing happens, open the modal using the Billing button in the header.
        </p>
      </div>
    </AppShell>
  );
}

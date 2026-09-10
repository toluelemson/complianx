// Billing domain route.
import { AppShell } from '@/app/layout/AppShell';
import { Panel } from '@/shared/components/ui/panel';

export default function BillingLandingPage() {
  return (
    <AppShell title="Billing" initialBillingOpen>
      <Panel className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold text-slate-900">
          Opening billing settings…
        </p>
        <p className="text-sm text-slate-500">
          We redirect you to the billing modal automatically. If nothing
          happens, open the modal using the Billing button in the header.
        </p>
      </Panel>
    </AppShell>
  );
}

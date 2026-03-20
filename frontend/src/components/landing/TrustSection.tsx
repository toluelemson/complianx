import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TRUST_BADGES = [
  'EU AI Act Readiness',
  'Audit-Ready Documentation',
  'Governance Workflows',
  'Risk & Control Mapping',
  'Human Oversight Support',
  'Secure Document Handling',
];

const ENTERPRISE_LOGOS = ['Aster Bank', 'NorthGrid', 'Velonix', 'CrestLedger', 'Aureline'];

export function TrustSection() {
  return (
    <section
      id="solutions"
      className="bg-slate-50 px-5 py-20 text-slate-950 sm:px-8 lg:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">
            High-trust environments
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Built for high-trust, regulated environments
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {TRUST_BADGES.map((item) => (
            <Card key={item} className="rounded-[1.75rem] border-slate-200 bg-white shadow-sm transition-transform duration-300 hover:-translate-y-1">
              <CardContent className="p-6">
                <p className="text-lg font-semibold text-slate-950">{item}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
            Enterprise teams
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {ENTERPRISE_LOGOS.map((logo) => (
              <div
                key={logo}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-600"
              >
                {logo}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

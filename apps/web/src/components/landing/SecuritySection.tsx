import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const POINTS = [
  'Structured governance workflows',
  'Clear documentation trails',
  'Versioned compliance artifacts',
  'Review-ready outputs',
  'Support for internal and external audits',
  'Human oversight aligned processes',
];

export function SecuritySection() {
  return (
    <section
      id="documentation"
      className="bg-slate-50 px-5 pb-20 text-slate-950 sm:px-8 lg:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <CardHeader className="border-b border-slate-200 bg-[#0f172a] p-8 text-white lg:border-b-0 lg:border-r lg:border-slate-800 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Trust and control
              </p>
              <CardTitle className="mt-4 text-4xl leading-tight text-white">
                Designed for trust, control, and accountability
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-8 sm:grid-cols-2 sm:p-10">
              {POINTS.map((point) => (
                <div
                  key={point}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-700"
                >
                  {point}
                </div>
              ))}
            </CardContent>
          </div>
        </Card>
      </div>
    </section>
  );
}

import { Card, CardContent } from '@/components/ui/card';

const CAPABILITIES = [
  'Submit your AI system',
  'Scope the documentation need',
  'Review risk and governance inputs',
  'Receive a first draft in 48 hours',
  'Refine for audit or diligence use',
  'Maintain records as systems evolve',
];

export function Capabilities() {
  return (
    <section
      id="api"
      className="bg-[#0f172a] px-5 py-20 text-white sm:px-8 lg:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">
            Workflow
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            A service workflow built for regulated AI teams
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CAPABILITIES.map((capability) => (
            <Card
              key={capability}
              className="rounded-[1.8rem] border-white/10 bg-white/[0.04] shadow-none backdrop-blur"
            >
              <CardContent className="p-6">
                <p className="text-xl font-semibold text-white">{capability}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

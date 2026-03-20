import { Card, CardContent } from '@/components/ui/card';

const CAPABILITIES = [
  'Documentation Generator',
  'Risk Register Builder',
  'Technical File Assistant',
  'Policy & Control Mapper',
  'Evidence Repository',
  'Review Workflow Support',
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
            Capabilities
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            The right tools for AI governance teams
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

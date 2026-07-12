import { ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';

const CAPABILITIES = [
  {
    step: '01',
    title: 'Intake that captures the real system',
    description:
      'Submit the model, use case, owner, and deployment context once so the work starts from accurate operating detail instead of a blank template.',
  },
  {
    step: '02',
    title: 'Scope driven by regulatory exposure',
    description:
      'We shape the documentation pack around risk class, governance expectations, oversight needs, and the evidence your team will actually need to defend.',
  },
  {
    step: '03',
    title: 'Drafts built with traceable evidence',
    description:
      'Policies, technical summaries, and supporting records are assembled as a connected pack, not as isolated documents that fall apart under review.',
  },
  {
    step: '04',
    title: 'Review loops without spreadsheet churn',
    description:
      'Owners, reviewers, and approvers work through one workflow so comments, revisions, and signatures stay attached to the project history.',
  },
];

const SIGNALS = [
  '48-hour first delivery for scoped packs',
  'Versioned project history for every review cycle',
  'Evidence aligned to audit, diligence, and governance requests',
];

export function Capabilities() {
  return (
    <section
      id="workflow"
      className="relative overflow-hidden bg-[#0f131a] px-5 py-20 text-white sm:px-8 lg:px-10 lg:py-24"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top_left,_rgba(248,250,252,0.12),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(125,211,252,0.1),_transparent_28%)]" />
      <div className="pointer-events-none absolute left-[8%] top-24 h-36 w-36 rounded-full bg-sky-300/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[10%] top-40 h-44 w-44 rounded-full bg-emerald-200/8 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <Badge className="border-white/10 bg-white/[0.04] px-4 py-2 text-slate-200">
            <Sparkles className="mr-2 h-3.5 w-3.5 text-sky-300" />
            Service workflow
          </Badge>
          <h2 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Documentation work with an operating rhythm your team can trust
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
            NeuralDocx is not a prompt box dressed up as compliance software.
            It runs intake, drafting, review, and evidence handling as one
            controlled delivery system.
          </p>

          <Card className="mt-8 rounded-[1.9rem] border-white/10 bg-white/[0.04] shadow-none backdrop-blur-sm">
            <CardContent className="p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                What changes
              </p>
              <div className="mt-5 space-y-4">
                {SIGNALS.map((signal) => (
                  <div
                    key={signal}
                    className="flex items-start gap-3 border-b border-white/8 pb-4 last:border-b-0 last:pb-0"
                  >
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-300" />
                    <p className="text-sm leading-7 text-slate-200">{signal}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          {CAPABILITIES.map((capability, index) => (
            <Card
              key={capability.step}
              className="group rounded-[2rem] border-white/10 bg-white/[0.04] shadow-none backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
            >
              <CardContent className="p-6 sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-lg font-semibold text-white">
                      {capability.step}
                    </div>
                    <div className="max-w-2xl">
                      <p className="text-2xl font-semibold leading-tight text-white">
                        {capability.title}
                      </p>
                      <p className="mt-3 text-base leading-8 text-slate-300">
                        {capability.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                    Stage {index + 1}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

import { Card, CardContent } from '@/shared/components/ui/card';

const TESTIMONIALS = [
  {
    quote:
      'NeuralDocx significantly reduced the time our team spent preparing AI governance documentation.',
    role: 'Head of Compliance',
  },
  {
    quote:
      'A strong foundation for audit readiness and internal AI compliance workflows.',
    role: 'AI Governance Lead',
  },
  {
    quote:
      'It helped us turn scattered compliance tasks into a repeatable operating process.',
    role: 'Risk Manager',
  },
];

export function Testimonials() {
  return (
    <section className="bg-slate-50 px-5 py-20 text-slate-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">
            Outcomes
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            What enterprise teams say
          </h2>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <Card
              key={item.quote}
              className="rounded-[1.75rem] border-slate-200 bg-white shadow-sm"
            >
              <CardContent className="p-7">
                <p className="text-lg leading-8 text-slate-700">
                  “{item.quote}”
                </p>
                <p className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {item.role}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

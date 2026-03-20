import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FEATURES = [
  {
    badge: 'Core',
    title: 'Generate Audit-Ready AI Documentation',
    description:
      'Automatically produce structured technical files, governance records, risk documentation, and compliance evidence for internal reviews and external audits.',
  },
  {
    badge: 'Governance',
    title: 'Track Risks, Controls, and Human Oversight',
    description:
      'Map AI risks to controls, document mitigation steps, and maintain traceable records for accountability, oversight, and policy alignment.',
  },
  {
    badge: 'Automation',
    title: 'Keep Compliance Records Up to Date',
    description:
      'Reduce manual work by continuously updating documentation as your AI systems, processes, and controls evolve.',
  },
  {
    badge: 'Evidence',
    title: 'Centralize Compliance Evidence',
    description:
      'Store model details, approvals, evaluations, system changes, and supporting artifacts in one organized compliance workspace.',
  },
];

export function Features() {
  return (
    <section
      id="product"
      className="bg-slate-50 px-5 pb-20 text-slate-950 sm:px-8 lg:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-4 lg:grid-cols-2">
          {FEATURES.map((feature) => (
            <Card
              key={feature.title}
              className="rounded-[1.9rem] border-slate-200 bg-white shadow-sm transition-transform duration-300 hover:-translate-y-1"
            >
              <CardHeader className="p-7">
                <Badge className="w-fit border-sky-200 bg-sky-50 text-sky-800">
                  {feature.badge}
                </Badge>
                <CardTitle className="mt-4 text-3xl leading-tight text-slate-950">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-7 pb-7 pt-0">
                <p className="text-base leading-8 text-slate-600">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

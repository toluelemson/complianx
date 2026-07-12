import { Badge } from '@/shared/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';

const FEATURES = [
  {
    badge: 'Delivery',
    title: 'Receive a first documentation pack in 48 hours',
    description:
      'Submit your AI system once, then receive a scoped first draft with technical documentation, governance records, and review-ready evidence.',
  },
  {
    badge: 'Review',
    title: 'Built for real risk, control, and oversight work',
    description:
      'NeuralDocx structures risk findings, control mapping, and governance inputs so your team has materials that support audit and internal review.',
  },
  {
    badge: 'Workflow',
    title: 'A clear service workflow from intake to delivery',
    description:
      'Move through submission, scope review, documentation prep, and handoff without chasing fragmented templates, files, and advisors.',
  },
  {
    badge: 'Trust',
    title: 'Documentation that is ready to share',
    description:
      'Use polished outputs for customer diligence, audit prep, governance meetings, and procurement conversations that need credible evidence fast.',
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

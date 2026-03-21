import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function CTASection() {
  return (
    <section className="bg-slate-50 px-5 pb-20 text-slate-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Card className="rounded-[2rem] border-[#0f172a] bg-[#0f172a] text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.6)]">
          <CardContent className="flex flex-col gap-8 p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/75">
                Start with structure
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Make AI compliance documentation faster, clearer, and audit-ready
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-300">
                NeuralDocx helps your team move from scattered files and manual
                effort to a structured compliance workflow.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-sky-600 text-white hover:bg-sky-500">
                <Link to="/submit-system">Submit your system</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white"
              >
                <a
                  href="https://calendly.com/neuraldocx"
                  target="_blank"
                  rel="noreferrer"
                >
                  For enterprise, book a demo
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

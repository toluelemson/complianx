import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface HeroProps {
  onOpenTrial: () => void;
}

export function Hero({ onOpenTrial }: HeroProps) {
  return (
    <section
      id="product"
      className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-24 sm:px-8 sm:pt-28 lg:px-10 lg:pb-24 lg:pt-36"
    >
      <div className="flex justify-center">
        <div className="max-w-5xl animate-enter-up text-center">
          <Badge className="animate-enter-up animation-delay-100 inline-flex items-center gap-2 border-white/10 bg-white/[0.03] px-4 py-2 text-slate-200">
            <Heart className="h-3.5 w-3.5 fill-current text-slate-200" />
            <span>Built for regulated AI teams</span>
          </Badge>
          <h1 className="animate-enter-up animation-delay-200 mt-6 max-w-5xl text-4xl font-semibold tracking-tight text-white [font-family:'SF_Pro_Display','SF_Pro_Text','__geist_e6b681',Inter,system-ui,sans-serif] sm:text-6xl lg:text-[4rem] lg:leading-[0.98]">
            AI Compliance Documentation, Automated
          </h1>
          <p className="animate-enter-up animation-delay-300 mx-auto mt-6 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
            NeuralDocx helps teams generate, organize, and maintain audit-ready
            AI documentation, governance records, risk evidence, and compliance
            reports at scale.
          </p>

          <div className="animate-enter-up animation-delay-400 mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" className="w-full bg-slate-200 px-7 text-slate-950 transition-transform duration-300 hover:-translate-y-0.5 hover:bg-white sm:w-auto">
              <Link to="/signup?type=company">Get Started</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onOpenTrial}
              className="w-full border-white/15 bg-white/[0.03] px-7 text-white transition-transform duration-300 hover:-translate-y-0.5 hover:bg-white/[0.08] hover:text-white sm:w-auto"
            >
              Book Demo
            </Button>
          </div>
          <div className="animate-enter-up animation-delay-500 mt-5 text-sm text-slate-400">
            Need a quick compliance check first?{' '}
            <Link
              to="/eu-ai-act-checker"
              className="font-medium text-slate-200 transition-colors hover:text-white"
            >
              Try the public questionnaire
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

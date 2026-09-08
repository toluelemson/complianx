import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { trackMarketingEvent } from '@/platform/analytics/marketing';
import { buildSubmitSystemHref } from '../lib/submit-system';

export function Hero() {
  return (
    <section
      id="product"
      className="hz-marketing-hero relative z-10 w-full"
    >
      <div className="hz-marketing-container hz-marketing-hero__grid min-w-0">
        <div className="min-w-0 max-w-2xl animate-enter-up">
          <Badge className="animate-enter-up animation-delay-100 inline-flex items-center gap-2 border-[#f3c4cb] bg-[#fdf3f4] px-3 py-1.5 text-[#d40c2e]">
            <Heart className="h-3.5 w-3.5 fill-current" />
            <span>AI governance workspace</span>
          </Badge>
          <h1 className="animate-enter-up animation-delay-200 mt-6 max-w-[680px] text-4xl font-medium tracking-[-0.04em] text-[#383838] sm:text-6xl lg:text-[4rem] lg:leading-[1.02]">
            Keep every AI system ready for review.
          </h1>
          <p className="animate-enter-up animation-delay-300 mt-6 max-w-xl text-base leading-7 text-[#5e5e5e] sm:text-lg sm:leading-8">
            Register the system, map its obligations, attach evidence, and
            produce a defensible readiness record for your team.
          </p>

          <div className="hz-marketing-actions animate-enter-up animation-delay-400 mt-8 flex flex-col justify-start gap-3 sm:flex-row sm:flex-wrap">
            <Button
              asChild
              size="lg"
              className="w-full bg-[#d40c2e] px-7 text-white hover:bg-[#e21236] sm:w-auto"
            >
              <Link
                to={buildSubmitSystemHref({ source: 'hero' })}
                onClick={() =>
                  trackMarketingEvent('marketing_submit_cta_clicked', {
                    source: 'hero',
                  })
                }
              >
                Submit your system
              </Link>
            </Button>
            <Link
              to="/eu-ai-act-checker"
              className="inline-flex items-center justify-center px-2 py-3 text-sm font-semibold text-[#5e5e5e] underline decoration-[#dbdbdb] underline-offset-4 transition hover:text-[#d40c2e] hover:decoration-[#d40c2e] sm:justify-start"
            >
              Run compliance check first
            </Link>
          </div>
        </div>
        <div className="min-w-0 w-full animate-enter-scale rounded-[6px] border border-[#e8e8e8] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,.1),0_1px_2px_rgba(0,0,0,.06)]">
          <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#8a8a8a]">Workspace snapshot</p>
              <p className="mt-2 font-[Montserrat,Inter,sans-serif] text-lg font-medium text-[#383838]">EU AI Act readiness</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-[4px] bg-[#e9fcf0] px-2.5 py-1 text-xs font-medium text-[#17a64e]"><span className="h-2 w-2 rounded-full bg-[#1dd363]" />Live</span>
          </div>
          <div className="mt-6 space-y-5">
            {['System context', 'Obligations', 'Evidence coverage'].map((item, index) => (
              <div key={item} className="flex items-center justify-between gap-4">
                <span className="text-sm text-[#5e5e5e]">{item}</span>
                <span className="text-sm font-medium text-[#383838]">{index === 2 ? '0%' : 'Ready to map'}</span>
              </div>
            ))}
          </div>
          <div className="mt-7 border-t border-[#e8e8e8] pt-5 text-sm text-[#8a8a8a]">A clear starting point for your next compliance decision.</div>
        </div>
      </div>
    </section>
  );
}

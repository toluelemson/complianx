import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { trackMarketingEvent } from '@/platform/analytics/marketing';
import { buildSubmitSystemHref } from '../lib/submit-system';

export function Hero() {
  return (
    <section
      id="product"
      className="hz-marketing-hero relative z-10 w-full"
    >
      <div className="hz-marketing-container min-w-0">
        <div className="min-w-0 max-w-3xl animate-enter-up">
          <h1 className="animate-enter-up animation-delay-100 max-w-[680px] text-4xl font-medium tracking-[-0.04em] text-[#383838] sm:text-6xl lg:text-[4rem] lg:leading-[1.02]">
            Keep every AI system ready for review.
          </h1>
          <p className="animate-enter-up animation-delay-200 mt-5 max-w-xl text-base leading-7 text-[#5e5e5e] sm:text-lg sm:leading-8">
            Register systems, organize evidence, and stay ready for review.
          </p>

          <div className="hz-marketing-actions animate-enter-up animation-delay-300 mt-7 flex flex-col justify-start gap-3 sm:flex-row sm:flex-wrap">
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

          <div className="animate-enter-up animation-delay-400 mt-12 border-t border-[#e8e8e8] pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a8a8a]">
              How it works
            </p>
            <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              {['Register system', 'Map obligations', 'Attach evidence', 'Review'].map(
                (step, index, steps) => (
                  <div key={step} className="flex items-center gap-3 text-sm font-medium text-[#383838]">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fdf3f4] text-xs text-[#d40c2e]">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                    {index < steps.length - 1 ? (
                      <ArrowRight className="hidden h-3.5 w-3.5 text-[#b2b2b2] sm:block" />
                    ) : null}
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

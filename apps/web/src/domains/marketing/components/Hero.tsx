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
      <div className="hz-marketing-container grid min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-center lg:gap-16">
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

          <div className="animate-enter-up animation-delay-400 mt-8 border-t border-[#e8e8e8] pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a8a8a]">
              How it works
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
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
        <div className="relative mx-auto hidden h-72 w-full max-w-sm items-center justify-center lg:flex" aria-hidden="true">
          <div className="absolute h-56 w-64 -translate-x-5 translate-y-5 rotate-[-6deg] rounded-md border border-[#e8e8e8] bg-[#fafafa]" />
          <div className="absolute h-60 w-64 translate-x-4 translate-y-2 rotate-[5deg] rounded-md border border-[#e8e8e8] bg-white shadow-[0_16px_40px_rgba(56,56,56,0.08)]" />
          <div className="relative h-64 w-64 rounded-md border border-[#dbdbdb] bg-white p-6 shadow-[0_18px_45px_rgba(56,56,56,0.12)]">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a8a8a]">Readiness record</span>
              <span className="h-2 w-2 rounded-full bg-[#17a64e]" />
            </div>
            <div className="mt-5 space-y-4">
              {[['System context', 'Complete'], ['Obligations', 'Mapped'], ['Evidence', 'In progress']].map(([label, status]) => (
                <div key={label} className="flex items-center justify-between gap-3 border-b border-[#f0f0f0] pb-3 text-xs">
                  <span className="text-[#5e5e5e]">{label}</span>
                  <span className="font-medium text-[#383838]">{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

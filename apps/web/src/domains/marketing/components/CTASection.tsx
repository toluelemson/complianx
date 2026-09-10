import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { trackMarketingEvent } from '@/platform/analytics/marketing';
import { buildSubmitSystemHref } from '../lib/submit-system';

export function CTASection() {
  return (
    <section
      data-nav-theme="light"
      className="bg-[var(--cx-canvas)] px-5 pb-24 text-[var(--cx-text)] sm:px-8 lg:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <Card className="overflow-hidden rounded-[var(--cx-radius)] border-[var(--cx-border)] bg-[var(--cx-surface)] text-[var(--cx-text)] shadow-[var(--cx-shadow-sm)]">
          <CardContent className="flex flex-col gap-8 p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cx-text-muted)]">
                Start with one AI system
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--cx-text)] sm:text-5xl">
                A reviewable package for every AI system.
              </h2>
              <p className="mt-4 text-base leading-8 text-[var(--cx-text-secondary)]">
                Capture facts. Map evidence. Review.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-[var(--cx-brand)] text-white hover:bg-[var(--cx-brand-hover)]"
              >
                <Link
                  to={buildSubmitSystemHref({ source: 'cta_section' })}
                  onClick={() =>
                    trackMarketingEvent('marketing_submit_cta_clicked', {
                      source: 'cta_section',
                    })
                  }
                >
                  Assess an AI system
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <a
                href="https://calendly.com/neuraldocx"
                target="_blank"
                rel="noreferrer"
            className="inline-flex items-center px-2 py-3 text-sm font-semibold text-[var(--cx-text-secondary)] underline decoration-[var(--cx-border-strong)] underline-offset-4 transition hover:text-[var(--cx-text)] hover:decoration-[var(--cx-border-strong)]"
              >
                Discuss a consultancy workflow
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

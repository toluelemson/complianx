import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { trackMarketingEvent } from '@/platform/analytics/marketing';
import {
  buildSubmitSystemHref,
  type SubmitSystemPackageInterest,
  type SubmitSystemSource,
} from '../lib/submit-system';

type PricingPlan = {
  name: string;
  tagline: string;
  price: string;
  suffix: string;
  billing?: string;
  cta: string;
  href?: string;
  external?: boolean;
  featured?: boolean;
  comingSoon?: boolean;
  packageInterest?: SubmitSystemPackageInterest;
  source?: SubmitSystemSource;
  sections: {
    title: string;
    items: string[];
  }[];
};

const PRICING_PLANS: PricingPlan[] = [
  {
    name: 'Starter',
    tagline: 'A focused first compliance pack',
    price: 'EUR500 - EUR1,500',
    suffix: 'per engagement',
    billing: '2–4 day turnaround',
    cta: 'Choose Starter',
    packageInterest: 'starter',
    source: 'pricing_starter',
    sections: [
      {
        title: 'Included',
        items: [
          'AI system intake and scope review',
          'Core system description',
          'Initial risk assessment',
          'EU AI Act aligned summary pack',
        ],
      },
    ],
  },
  {
    name: 'Professional',
    tagline: 'Deeper coverage for diligence or audit',
    price: 'EUR2,000 - EUR5,000',
    suffix: 'per engagement',
    billing: 'Most common engagement',
    cta: 'Choose Professional',
    packageInterest: 'professional',
    source: 'pricing_professional',
    featured: true,
    sections: [
      {
        title: 'Included',
        items: [
          'Everything in Starter',
          'Deeper risk and control analysis',
          'Governance documentation set',
          'Mitigation and review notes',
        ],
      },
    ],
  },
  {
    name: 'Enterprise',
    tagline: 'A complete workstream for regulated programs',
    price: 'EUR8,000 - EUR20,000+',
    suffix: 'custom scope',
    billing: 'Talk to sales',
    cta: 'Talk to us',
    href: 'https://calendly.com/neuraldocx',
    external: true,
    source: 'pricing_enterprise',
    sections: [
      {
        title: 'Included',
        items: [
          'Full documentation workstream',
          'Advanced risk and compliance mapping',
          'EU AI Act classification support',
          'Internal governance alignment',
          'Ongoing advisory engagement',
        ],
      },
    ],
  },
  {
    name: 'SaaS',
    tagline: 'For teams that want a self-serve workflow later',
    price: 'Coming soon',
    suffix: 'product roadmap',
    billing: 'Join the early access list',
    cta: 'Coming Soon',
    packageInterest: 'not_sure',
    source: 'pricing_saas',
    comingSoon: true,
    sections: [
      {
        title: 'Planned',
        items: [
          'Guided self-serve system intake',
          'Structured documentation workflow',
          'Shared workspace for updates',
          'Review and export support',
        ],
      },
    ],
  },
];

export function PricingSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const [openPlan, setOpenPlan] = useState<string | null>(null);
  const servicePlans = PRICING_PLANS.filter((plan) => !plan.comingSoon);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="hz-pricing-blueprint relative overflow-hidden px-5 pb-24 pt-20 sm:px-8 lg:px-10 lg:pt-24"
    >
      <div className="hz-marketing-container">
        <div
          className={`text-center transition-all duration-700 ${
            inView ? 'animate-enter-up' : 'translate-y-6 opacity-0'
          }`}
        >
          <h2 className="text-4xl font-semibold tracking-tight text-[#383838] sm:text-5xl">
            Compliance support, sized to the work
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#5e5e5e]">
            One system, a deeper review, or a complete workstream.
          </p>
        </div>

        <div className="hz-pricing-blueprint__grid hz-pricing-blueprint__grid--services mx-auto mt-10 max-w-6xl">
          {servicePlans.map((plan, index) => (
            <Card
              key={plan.name}
                className={`hz-pricing-blueprint__card shadow-none transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-42px_rgba(15,23,42,0.5)] ${
                plan.featured
                  ? 'hz-pricing-blueprint__card--featured border-[#d40c2e] text-[#383838]'
                  : plan.comingSoon
                    ? 'border-[var(--cx-border)] bg-[var(--cx-surface)] text-[var(--cx-text)]'
                    : 'border-[var(--cx-border)] bg-[var(--cx-surface)] text-[var(--cx-text)]'
              } ${inView ? 'animate-enter-scale' : 'translate-y-6 opacity-0'}`}
              style={inView ? { animationDelay: `${0.1 + index * 0.08}s` } : undefined}
            >
              <CardContent className="flex flex-col p-6">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-2xl font-semibold">{plan.name}</h3>
                  </div>
                  <p className="mt-2 text-sm text-[#5e5e5e]">
                    {plan.tagline}
                  </p>

                  <div className="mt-6">
                    <div className="hz-pricing-price text-5xl font-semibold tracking-tight">
                      {plan.price}
                    </div>
                    <p className="mt-2 text-sm text-[#5e5e5e]">
                      {plan.suffix}
                    </p>
                    {plan.billing ? (
                      <p className="mt-1 text-sm text-[#8a8a8a]">
                        {plan.billing}
                      </p>
                    ) : null}
                  </div>

                  {plan.comingSoon ? (
                    <Button
                      size="lg"
                      disabled
                      className="mt-6 w-full cursor-not-allowed border border-[#dbdbdb] bg-[#fafafa] text-[#8a8a8a] opacity-100"
                    >
                      {plan.cta}
                    </Button>
                  ) : (
                    <Button
                      asChild
                      size="lg"
                      className={`mt-6 w-full transition duration-300 hover:scale-[1.01] ${
                        'bg-[#d40c2e] text-white hover:bg-[#e21236]'
                      }`}
                    >
                      {plan.external ? (
                        <a
                          href={plan.href}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() =>
                            trackMarketingEvent(
                              'marketing_enterprise_cta_clicked',
                              {
                                source: plan.source ?? plan.name.toLowerCase(),
                              },
                            )
                          }
                        >
                          {plan.cta}
                        </a>
                      ) : (
                        <Link
                          to={buildSubmitSystemHref({
                            packageInterest: plan.packageInterest,
                            source: plan.source ?? 'pricing_starter',
                          })}
                          onClick={() =>
                            trackMarketingEvent('marketing_submit_cta_clicked', {
                              package_interest: plan.packageInterest ?? null,
                              source: plan.source ?? plan.name.toLowerCase(),
                            })
                          }
                        >
                          {plan.cta}
                        </Link>
                      )}
                    </Button>
                  )}
                </div>

                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenPlan((current) =>
                        current === plan.name ? null : plan.name,
                      )
                    }
                    aria-expanded={openPlan === plan.name}
                    className="flex w-full items-center justify-between text-left text-sm font-semibold text-[var(--cx-text)] underline decoration-[var(--cx-border-strong)] underline-offset-4 transition hover:text-[#5e5e5e] hover:decoration-[var(--cx-border-strong)]"
                  >
                    View features
                    <span
                      className={`text-base text-[var(--cx-text-muted)] transition ${
                        openPlan === plan.name ? 'rotate-180' : ''
                      }`}
                    >
                      ⌄
                    </span>
                  </button>
                  {openPlan === plan.name ? (
                    <div className="mt-5 space-y-7">
                      {plan.sections.map((section, sectionIndex) => (
                        <div key={section.title}>
                          <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--cx-text-muted)]">
                            {section.title}
                          </h4>
                          <div className="mt-3 space-y-3">
                            {section.items.map((item, itemIndex) => (
                              <div
                                key={item}
                                className="flex items-start gap-3 animate-enter-fade"
                                style={
                                  inView
                                    ? {
                                        animationDelay: `${0.2 + index * 0.08 + sectionIndex * 0.06 + itemIndex * 0.04}s`,
                                      }
                                    : undefined
                                }
                              >
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#17a64e]" />
                                <span className="text-sm leading-6 text-[#5e5e5e]">
                                  {item}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-2 border-t border-[var(--cx-border)] pt-5 text-sm text-[var(--cx-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
          <span>Self-serve workspace coming soon.</span>
          <Link
            to={buildSubmitSystemHref({
              packageInterest: 'not_sure',
              source: 'pricing_saas',
            })}
            className="font-semibold text-[var(--cx-text)] underline decoration-[var(--cx-border-strong)] underline-offset-4 transition hover:text-[#5e5e5e] hover:decoration-[var(--cx-border-strong)]"
          >
            Join the early access list
          </Link>
        </div>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { trackMarketingEvent } from '@/platform/analytics/marketing';
import {
  buildSubmitSystemHref,
  buildPlanSignupHref,
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
    name: 'Trial',
    tagline: 'Try the classification questionnaire',
    price: 'Free',
    suffix: 'one free classification',
    billing: 'No account required',
    cta: 'Start classification',
    packageInterest: 'starter',
    source: 'pricing_starter',
    sections: [
      {
        title: 'Included',
        items: [
          'EU AI Act classification questionnaire',
          'Immediate indicative classification result',
          'Clear next steps for workspace or assisted support',
        ],
      },
    ],
  },
  {
    name: 'Pro workspace',
    tagline: 'For teams managing AI systems',
    price: '€149',
    suffix: 'per workspace / month',
    billing: '€1,490 billed annually',
    cta: 'Join early access',
    packageInterest: 'professional',
    source: 'pricing_professional',
    sections: [
      {
        title: 'Included',
        items: [
          'EU AI Act documentation package',
          'Evidence and version history',
          'Review, approval, and PDF export',
        ],
      },
    ],
  },
  {
    name: 'Done-for-you',
    tagline: 'We prepare the package with you',
    price: 'From €2,500',
    suffix: 'one-time service',
    billing: 'Final scope confirmed after intake',
    cta: 'Request assisted setup',
    source: 'pricing_saas',
    sections: [{
      title: 'Included',
      items: [
        'Standard — from €2,500',
        'High-risk — from €5,000',
        'Portfolio — from €8,000',
        'Monitoring — €199–€499/month',
      ],
    }],
  },
  {
    name: 'Enterprise',
    tagline: 'For larger programs',
    price: 'Custom',
    suffix: 'workspace and advisory scope',
    billing: 'Talk to us about fit',
    cta: 'Discuss your workflow',
    href: 'https://calendly.com/neuraldocx',
    external: true,
    source: 'pricing_enterprise',
    sections: [
      {
        title: 'Discuss',
        items: [
          'Multiple business workspaces',
          'Implementation and migration support',
          'Configurable review and handover workflows',
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
  const signupMode = import.meta.env.VITE_SIGNUP_MODE ?? 'invite_only';
  const restrictedSignup = signupMode !== 'open';

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
            A workspace for each stage of documentation
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#5e5e5e]">
            One workspace. Clear documentation. Pro includes the full paid workspace.
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
              style={
                inView
                  ? { animationDelay: `${0.1 + index * 0.08}s` }
                  : undefined
              }
            >
              <CardContent className="flex flex-col p-6">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-2xl font-semibold">{plan.name}</h3>
                  </div>
                  <p className="mt-2 text-sm text-[#5e5e5e]">{plan.tagline}</p>

                  <div className="mt-6">
                    <div className="hz-pricing-price text-5xl font-semibold tracking-tight">
                      {plan.price}
                    </div>
                    <p className="mt-2 text-sm text-[#5e5e5e]">{plan.suffix}</p>
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
                      className={`mt-6 w-full transition duration-300 hover:scale-[1.01] ${'bg-[#d40c2e] text-white hover:bg-[#e21236]'}`}
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
                          to={
                            plan.name === 'Trial'
                              ? '/eu-ai-act-checker?source=pricing_starter'
                              : restrictedSignup
                              ? plan.name === 'Done-for-you'
                                ? buildSubmitSystemHref({
                                    packageInterest: 'enterprise',
                                    source: 'done_for_you',
                                  })
                                : `/login?plan=${plan.name.toLowerCase()}`
                              : plan.packageInterest === 'enterprise'
                                ? buildPlanSignupHref('enterprise')
                                : plan.packageInterest
                                  ? buildPlanSignupHref('pro')
                                  : buildSubmitSystemHref({
                                      packageInterest: plan.packageInterest,
                                      source: plan.source ?? 'pricing_starter',
                                    })
                          }
                          onClick={() =>
                            trackMarketingEvent(
                              'marketing_submit_cta_clicked',
                              {
                                package_interest: plan.packageInterest ?? null,
                                source: plan.source ?? plan.name.toLowerCase(),
                              },
                            )
                          }
                        >
                          {restrictedSignup
                            ? plan.name === 'Trial'
                              ? 'Start classification'
                              : plan.name === 'Done-for-you'
                              ? 'Request assisted setup'
                              : plan.name === 'Consultancy'
                              ? 'Talk to us about consultancy'
                              : plan.name === 'Enterprise'
                                ? 'Contact sales'
                                : `Request ${plan.name} access`
                            : plan.name === 'Enterprise'
                              ? 'Start Enterprise'
                              : `Start ${plan.name}`}
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {openPlan ? (() => {
          const selectedPlan = servicePlans.find((plan) => plan.name === openPlan);
          if (!selectedPlan) return null;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenPlan(null); }}>
              <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--cx-border)] bg-[var(--cx-surface)] p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="pricing-features-title">
              <div className="flex items-center justify-between gap-4">
                <h3 id="pricing-features-title" className="text-lg font-semibold text-[var(--cx-text)]">{selectedPlan.name} features</h3>
                <button type="button" className="text-sm font-semibold underline" onClick={() => setOpenPlan(null)}>Close</button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {selectedPlan.sections.flatMap((section) => section.items).map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm leading-6 text-[var(--cx-text-secondary)]">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[#17a64e]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              </div>
            </div>
          );
        })() : null}

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

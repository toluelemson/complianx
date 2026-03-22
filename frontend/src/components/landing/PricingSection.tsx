import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type PricingPlan = {
  name: string;
  tagline: string;
  price: string;
  suffix: string;
  billing?: string;
  cta: string;
  href: string;
  external?: boolean;
  featured?: boolean;
  comingSoon?: boolean;
  sections: {
    title: string;
    items: string[];
  }[];
};

const PRICING_PLANS: PricingPlan[] = [
  {
    name: 'Starter',
    tagline: 'For early teams that need a fast first pack',
    price: 'EUR500 - EUR1,500',
    suffix: 'per engagement',
    billing: 'Turnaround: 2-4 days',
    cta: 'Get Starter Audit',
    href: '/submit-system',
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
    tagline: 'For growing teams preparing for diligence or audit',
    price: 'EUR2,000 - EUR5,000',
    suffix: 'per engagement',
    billing: 'Most common engagement',
    cta: 'Talk About Professional',
    href: '/submit-system',
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
    tagline: 'For banks, fintechs, and regulated AI programs',
    price: 'EUR8,000 - EUR20,000+',
    suffix: 'custom scope',
    billing: 'Talk to sales',
    cta: 'Book Enterprise Review',
    href: 'https://calendly.com/neuraldocx',
    external: true,
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
    href: '/submit-system',
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
      className="px-5 pb-24 pt-16 sm:px-8 lg:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <div
          className={`text-center transition-all duration-700 ${
            inView ? 'animate-enter-up' : 'translate-y-6 opacity-0'
          }`}
        >
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Service plans for every stage of AI compliance
          </h2>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-200">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-300">
              <Zap className="h-3.5 w-3.5" />
            </span>
            <span>Faster first delivery</span>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {PRICING_PLANS.map((plan, index) => (
            <Card
              key={plan.name}
              className={`h-full rounded-[2rem] shadow-none transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-42px_rgba(15,23,42,0.5)] ${
                plan.featured
                  ? 'animate-float-soft border-[#3B82F6]/30 text-white'
                  : plan.comingSoon
                    ? 'border-white/12 bg-white/[0.02] text-white'
                  : 'border-white/10 bg-white/[0.03] text-white'
              } ${inView ? 'animate-enter-scale' : 'translate-y-6 opacity-0'}`}
              style={{
                ...(inView
                  ? { animationDelay: `${0.1 + index * 0.08}s` }
                  : {}),
                ...(plan.featured ? { backgroundColor: '#07296A' } : {}),
              }}
            >
              <CardContent className="flex h-full flex-col p-7">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-2xl font-semibold">{plan.name}</h3>
                    {plan.featured ? (
                      <div className="inline-flex shrink-0 items-center rounded-full border border-[#6366F1]/35 bg-[#2D2E8F] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white">
                        Most Popular
                      </div>
                    ) : plan.comingSoon ? (
                      <div className="inline-flex shrink-0 items-center rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200">
                        Coming Soon
                      </div>
                    ) : null}
                  </div>
                  <p
                    className={`mt-2 text-sm ${
                      plan.featured ? 'text-blue-100/85' : 'text-slate-400'
                    }`}
                  >
                    {plan.tagline}
                  </p>

                  <div className="mt-6">
                    <div className="text-5xl font-semibold tracking-tight">
                      {plan.price}
                    </div>
                    <p
                      className={`mt-2 text-sm ${
                        plan.featured ? 'text-blue-100/85' : 'text-slate-400'
                      }`}
                    >
                      {plan.suffix}
                    </p>
                    {plan.billing ? (
                      <p
                        className={`mt-1 text-sm ${
                          plan.featured ? 'text-blue-200/70' : 'text-slate-500'
                        }`}
                      >
                        {plan.billing}
                      </p>
                    ) : null}
                  </div>

                  {plan.comingSoon ? (
                    <Button
                      size="lg"
                      disabled
                      className="mt-6 w-full cursor-not-allowed border border-white/12 bg-white/[0.06] text-slate-200 opacity-100"
                    >
                      {plan.cta}
                    </Button>
                  ) : (
                    <Button
                      asChild
                      size="lg"
                      className={`mt-6 w-full transition duration-300 hover:scale-[1.01] ${
                        plan.featured
                          ? 'bg-white text-[#07296A] hover:bg-blue-50'
                          : 'bg-slate-200 text-slate-950 hover:bg-white'
                      }`}
                    >
                      {plan.external ? (
                        <a href={plan.href} target="_blank" rel="noreferrer">
                          {plan.cta}
                        </a>
                      ) : (
                        <Link to={plan.href}>{plan.cta}</Link>
                      )}
                    </Button>
                  )}
                </div>

                <div className="mt-8 space-y-7">
                  {plan.sections.map((section, sectionIndex) => (
                    <div key={section.title}>
                      <h4 className="text-base font-semibold">{section.title}</h4>
                      <div className="mt-3 space-y-3">
                        {section.items.map((item, itemIndex) => (
                          <div
                            key={item}
                            className={`flex items-start gap-3 ${
                              inView ? 'animate-enter-fade' : 'opacity-0'
                            }`}
                            style={
                              inView
                                ? {
                                    animationDelay: `${0.2 + index * 0.08 + sectionIndex * 0.06 + itemIndex * 0.04}s`,
                                  }
                                : undefined
                            }
                          >
                            <Check
                              className={`mt-0.5 h-4 w-4 shrink-0 ${
                                plan.featured ? 'text-cyan-200' : 'text-slate-300'
                              }`}
                            />
                            <span
                              className={`text-sm leading-6 ${
                                plan.featured ? 'text-blue-50' : 'text-slate-300'
                              }`}
                            >
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

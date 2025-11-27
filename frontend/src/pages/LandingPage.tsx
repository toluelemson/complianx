import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

function useAnimatedStats(targets: {
  docs: number;
  approvals: number;
  sections: number;
  aiSystems: number;
}) {
  const [stats, setStats] = useState({
    docs: 0,
    approvals: 0,
    sections: 0,
    aiSystems: 0,
  });
  useEffect(() => {
    let animationFrame: number;
    let start: number | null = null;
    const duration = 2200;
    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setStats({
        docs: Math.floor(targets.docs * progress),
        approvals: Math.floor(targets.approvals * progress),
        sections: Math.floor(targets.sections * progress),
        aiSystems: Math.floor(targets.aiSystems * progress),
      });
      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      }
    };
    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [targets.docs, targets.approvals, targets.sections, targets.aiSystems]);
  return stats;
}

export default function LandingPage() {
  const { token, initializing } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<HTMLDivElement[]>([]);

  const summaryQuery = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => api.get('/analytics/summary').then((res) => res.data),
  });
  const stats = useAnimatedStats(
    summaryQuery.data ?? { docs: 0, approvals: 0, sections: 0, aiSystems: 0 },
  );

  const pipeline = useMemo(
    () => [
      { title: 'Evidence intake', icon: '📥', detail: 'Drop in prompts, files, and data snippets.' },
      { title: 'Doc generation', icon: '🧾', detail: 'We turn your inputs into ready-to-share writeups.' },
      { title: 'Review & approve', icon: '✅', detail: 'Loop in teammates and lock final sections.' },
      { title: 'Release notes', icon: '📝', detail: 'Bundle summaries and share with stakeholders.' },
      {
        title: 'Trust monitoring',
        icon: '🛰️',
        detail: 'Fairness, robustness, drift dashboards (coming soon)',
        comingSoon: true,
      },
    ],
    [],
  );

  useEffect(() => {
    if (!stepRefs.current.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveStep(Number(entry.target.getAttribute('data-step') ?? 0));
          }
        });
      },
      { threshold: 0.6 },
    );
    stepRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  if (!initializing && token) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-tr from-sky-500/25 via-slate-400/20 to-emerald-400/20 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-gradient-to-tr from-fuchsia-500/30 via-amber-400/20 to-sky-400/20 blur-3xl animate-blob animation-delay-2000" />
      <div className="pointer-events-none absolute left-1/3 bottom-0 h-64 w-64 rounded-full bg-gradient-to-tr from-emerald-400/25 via-sky-400/20 to-fuchsia-400/20 blur-3xl animate-blob animation-delay-4000" />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-12 px-6 py-24">
        <div className="absolute inset-0 pointer-events-none rounded-[28px]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.2),transparent_45%)]" />
        </div>
        <div className="space-y-8 relative z-10">
          <div className="flex items-center gap-4">
            <img
              src="/compliance-icon.svg"
              alt="NeuralDocx logo"
              className="h-12 w-12 rounded-xl border border-white/40 bg-white/10 p-2"
            />
            <p className="text-sm uppercase tracking-wide text-sky-300">
              NeuralDocx — documentation + trust
            </p>
          </div>
          <div>
            <h1 className="relative overflow-hidden bg-gradient-to-r from-white via-sky-200 to-white bg-clip-text text-4xl font-semibold leading-tight text-transparent md:text-5xl">
              Build trustworthy AI docs in minutes.
              <span className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-sky-400/80 via-emerald-400/60 to-fuchsia-500/70 opacity-70 animate-pulse" />
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-200">
              Collect your prompts, evidence, and decisions, turn them into ready-to-share write-ups, and keep approvals in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/signup"
              className="group rounded-md bg-sky-500 px-6 py-3 text-base font-semibold text-white shadow transition-transform hover:-translate-y-0.5 hover:bg-sky-400"
            >
              Get Started
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
            <Link
              to="/login"
              className="rounded-md border border-white/30 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Log In
            </Link>
            <a
              href="https://calendly.com/neuraldocx"
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-white/30 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Book a demo
            </a>
          </div>
        </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-white/20 hover:shadow-xl hover:shadow-sky-500/10 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm uppercase tracking-wide text-slate-300">What you can do</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 font-semibold text-sky-200">
                Coming soon · Trust monitoring
              </span>
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-200">
                Optional fairness metrics
              </span>
            </div>
          </div>
          <ul className="mt-4 grid gap-3 text-slate-100 sm:grid-cols-2">
            <li className="transition hover:text-white/90">✔ EU AI Act technical documentation generator</li>
            <li className="transition hover:text-white/90">✔ Model cards and risk assessments</li>
            <li className="transition hover:text-white/90">✔ Trust monitoring: fairness, robustness, drift, cohorts</li>
            <li className="transition hover:text-white/90">✔ Evidence uploads with reviewer approval workflow</li>
            <li className="transition hover:text-white/90">✔ PDF exports with Evidence Appendix</li>
            <li className="transition hover:text-white/90">✔ Notifications, usage‑based limits, simple billing</li>
          </ul>
        </div>

        <div className="rounded-[32px] border border-white/5 bg-[#050911] p-6 overflow-hidden relative z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.35),transparent_45%)] blur-3xl opacity-70" />
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.05)_0,rgba(255,255,255,0.05)_2px,transparent_2px,transparent_24px)]" />
         <div className="pipeline relative flex gap-6 overflow-x-auto pb-4 lg:grid lg:grid-cols-5">
            <div className="pipeline-line" aria-hidden="true" />
            {pipeline.map((segment, idx) => (
              <div
                key={segment.title}
                className={`pipeline-card relative z-10 flex min-w-[220px] flex-col items-start gap-3 rounded-[24px] border border-white/10 bg-gradient-to-br from-[#0c1b33] to-[#0f172a] p-5 text-slate-100 animate-pulse-card transition-transform duration-500 ${
                  activeStep === idx
                    ? 'scale-105 border-sky-400 shadow-[0_25px_60px_rgba(14,165,233,0.35)]'
                    : ''
                }`}
                data-step={idx}
                ref={(el) => {
                  if (el) stepRefs.current[idx] = el;
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs uppercase tracking-widest text-slate-400">Step {idx + 1}</span>
                  <span className="text-3xl">{segment.icon}</span>
                </div>
                <h3 className="text-2xl font-semibold text-white">{segment.title}</h3>
                <p className="text-sm text-slate-300">{segment.detail}</p>
                {segment.comingSoon && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-wide text-amber-200">
                    Coming soon
                  </span>
                )}
                <div className="h-1 w-full rounded-full bg-gradient-to-r from-sky-500 via-emerald-400 to-fuchsia-500 opacity-70" />
                <span className="pipeline-progress" />
              </div>
            ))}
          </div>
        </div>

                <div className="mt-6 grid gap-4 md:grid-cols-4 relative z-10">
            {[
              { label: 'Docs processed', value: stats.docs },
              { label: 'Reviews done', value: stats.approvals },
              { label: 'Sections captured', value: stats.sections },
              { label: 'AI setups tracked', value: stats.aiSystems },
            ].map((stat) => {
            const value =
              typeof stat.value === 'number' && Number.isFinite(stat.value)
                ? stat.value
                : 0;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 shadow-lg shadow-sky-500/10 backdrop-blur"
              >
                <p className="text-xs uppercase tracking-wide text-slate-400">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{value.toLocaleString()}</p>
              </div>
            );
          })}
        </div>



        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-white/20 hover:shadow-xl hover:shadow-sky-500/10 relative z-10">
          <p className="text-sm uppercase tracking-wide text-slate-300">Pricing</p>
          <h2 className="mt-2 text-2xl font-semibold">Simple plans that scale with you</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-white/20 hover:shadow-lg hover:shadow-sky-500/10">
              <p className="text-lg font-semibold">Free</p>
              <p className="mt-1 text-3xl font-bold">$0</p>
              <ul className="mt-3 space-y-1 text-slate-200 text-sm">
                <li>• 3 documents per month</li>
                <li>• 10 trust analyses per month</li>
                <li>• Evidence attachments</li>
              </ul>
              <Link to="/signup" className="mt-4 inline-block rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400">
                Get started
              </Link>
            </div>
            <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-5 ring-1 ring-inset ring-sky-500/20 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-500/20">
              <p className="text-lg font-semibold">Pro</p>
              <p className="mt-1 text-3xl font-bold">
                $49<span className="text-base font-normal">/mo</span>
              </p>
              <ul className="mt-3 space-y-1 text-slate-200 text-sm">
                <li>• 25 documents per month</li>
                <li>• 250 trust analyses per month</li>
                <li>• All Free features</li>
                <li>• Priority support</li>
              </ul>
              <Link to="/signup" className="mt-4 inline-block rounded-md bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white">
                Start Pro
              </Link>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-white/20 hover:shadow-lg hover:shadow-sky-500/10">
              <p className="text-lg font-semibold">Enterprise</p>
              <p className="mt-1 text-3xl font-bold">Custom</p>
              <ul className="mt-3 space-y-1 text-slate-200 text-sm">
                <li>• Unlimited documents & analyses</li>
                <li>• SSO/SAML, audit logs</li>
                <li>• Custom templates & SLAs</li>
              </ul>
              <Link to="/contact" className="mt-4 inline-block rounded-md border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
                Contact sales
              </Link>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-300">You can change plans anytime. Taxes may apply.</p>
        </div>
      </div>

      <style>{`
        @keyframes blob { 0%,100% { transform: translate(0,0) scale(1);} 33% { transform: translate(10px,-10px) scale(1.05);} 66% { transform: translate(-10px,10px) scale(0.98);} }
        .animate-blob { animation: blob 12s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .pipeline {
          position: relative;
          isolation: isolate;
          scrollbar-width: none;
        }
        .pipeline::-webkit-scrollbar {
          display: none;
        }
        .pipeline-line {
          position: absolute;
          inset: 48% 4%;
          height: 2px;
          background: repeating-linear-gradient(
            90deg,
            rgba(56,189,248,0.75) 0,
            rgba(56,189,248,0.75) 10px,
            transparent 10px,
            transparent 20px
          );
          border-radius: 999px;
          animation: dashSlide 4s linear infinite;
          z-index: 0;
        }
        .pipeline-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, rgba(56,189,248,0.15), transparent 65%);
          opacity: 0;
          transition: opacity 0.6s;
        }
        .pipeline-card:hover::before,
        .pipeline-card.active::before {
          opacity: 0.6;
        }
        .pipeline-progress {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, rgba(14,165,233,0.25), transparent 65%);
          animation: pulseGlow 4s ease-in-out infinite;
        }
        .animate-pulse-card {
          animation: floatCard 6s ease-in-out infinite;
        }
        @keyframes dashSlide {
          0% { background-position: 0 0; }
          100% { background-position: 100px 0; }
        }
        @keyframes floatCard {
          0% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0% { opacity: 0.15; }
          50% { opacity: 0.4; }
          100% { opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}

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
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

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
      { threshold: 0.55 },
    );
    stepRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [pipeline]);

  if (!initializing && token) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-tr from-sky-500/25 via-slate-400/20 to-emerald-400/20 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-gradient-to-tr from-fuchsia-500/30 via-amber-400/20 to-sky-400/20 blur-3xl animate-blob animation-delay-2000" />
      <div className="pointer-events-none absolute left-1/3 bottom-0 h-64 w-64 rounded-full bg-gradient-to-tr from-emerald-400/25 via-sky-400/20 to-fuchsia-400/20 blur-3xl animate-blob animation-delay-4000" />
      <div className="relative mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
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
                Collect prompts, evidence, and approvals in a single workflow so regulators always see what they expect.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-[0.4em] text-slate-400">
                <span className="rounded-full border border-white/10 px-3 py-1 text-[10px]">
                  EU AI Act ready
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[10px]">
                  NIST AI RMF
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[10px]">
                  SOC 2
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/login"
                className="rounded-full border border-slate-600 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/80"
              >
                Log in
              </Link>
              <Link
                to="/signup?type=personal"
                className="rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                Create personal workspace
              </Link>
              <Link
                to="/signup?type=company"
                className="rounded-full bg-slate-800 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Launch company workspace
              </Link>
              <Link
                to="/contact"
                className="rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-white/90 transition hover:border-white/50"
              >
                Book a demo
              </Link>
            </div>
          </div>
          <div className="pipeline-panel relative z-10 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/90 to-slate-950/80 p-6 shadow-2xl shadow-sky-500/20">
            <div className="network-grid" aria-hidden />
            <div className="pipeline-line" aria-hidden />
            <div className="pipeline-cards relative flex gap-5 overflow-x-auto px-2 pb-1 pt-2">
              {pipeline.map((segment, idx) => {
                const isActive = activeStep === idx;
                return (
                  <div
                    ref={(el) => {
                      stepRefs.current[idx] = el;
                    }}
                    data-step={idx}
                    key={segment.title}
                    className={`pipeline-card relative z-10 min-w-[200px] flex-1 flex-col gap-3 rounded-[24px] border bg-gradient-to-br from-[#0c1b33] to-[#0f172a] p-5 text-slate-100 transition duration-500 ${
                      isActive
                        ? 'active border-sky-400/60 shadow-2xl shadow-cyan-500/40 scale-105 animate-pulse-card'
                        : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[0.6rem] uppercase tracking-[0.5em] text-slate-400">
                        Step {idx + 1}
                      </span>
                      <span className="text-3xl">{segment.icon}</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-white">{segment.title}</h3>
                    <p className="text-sm text-slate-300">{segment.detail}</p>
                    {segment.comingSoon && (
                      <span className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.5em] text-slate-300">
                        Coming soon
                      </span>
                    )}
                    <div className="mt-3 h-1 w-full rounded-full bg-gradient-to-r from-sky-500 via-emerald-400 to-fuchsia-500 opacity-70" />
                    <div className="absolute -right-5 bottom-4 h-10 w-10 rounded-full border border-white/20 bg-gradient-to-br from-sky-500/30 to-fuchsia-500/30 blur-2xl" />
                    <span className="pipeline-progress" />
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.4em] text-slate-300">
              <span className="rounded-full border border-white/20 px-4 py-1">Streaming connectors</span>
              <span className="rounded-full border border-white/20 px-4 py-1">Live metrics</span>
              <span className="rounded-full border border-white/20 px-4 py-1">Trust layer soon</span>
            </div>
            
          </div>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-4 relative z-10">
          {[
            { label: 'Docs processed', value: stats.docs },
            { label: 'Reviews done', value: stats.approvals },
            { label: 'Sections captured', value: stats.sections },
            { label: 'AI setups tracked', value: stats.aiSystems },
          ].map((stat) => {
            const value = Number.isFinite(stat.value) ? stat.value : 0;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200 shadow-lg shadow-sky-500/10 backdrop-blur"
              >
                <p className="text-xs uppercase tracking-wide text-slate-400">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{value.toLocaleString()}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2 relative z-10">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200 shadow-lg shadow-sky-500/10 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Trust layer</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Coming soon</h3>
            <p className="mt-2 text-slate-300">
              AI fairness scoring, drift alerts, and approval locks keep regulators confident without slowing your document flow.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.4em] text-slate-200">
              <span className="rounded-full bg-white/10 px-3 py-1">EU AI Act</span>
              <span className="rounded-full bg-white/10 px-3 py-1">NIST AI RMF</span>
              <span className="rounded-full bg-white/10 px-3 py-1">ISO 27001</span>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200 shadow-lg shadow-emerald-500/10 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Live insight</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Data that drives the demo</h3>
            <p className="mt-2 text-slate-300">
              NeuralDocx pulls counts from uploads, approvals, and AI systems created so the streaming line always feels alive.
            </p>
            <p className="mt-4 text-sm text-slate-300">
              Every pipeline step reacts to what teams are doing — the same numbers fuel the animation, analytics, and CTA you just clicked.
            </p>
          </div>
        </div>
        <div className="mt-10 relative z-10">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-white/20 hover:shadow-xl hover:shadow-sky-500/10">
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
      </div>

      <style>{`
        @keyframes blob { 0%,100% { transform: translate(0,0) scale(1);} 33% { transform: translate(10px,-10px) scale(1.05);} 66% { transform: translate(-10px,10px) scale(0.98);} }
        .animate-blob { animation: blob 12s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .pipeline-panel {
          position: relative;
          isolation: isolate;
        }
        .network-grid {
          position: absolute;
          inset: -10% -20% 0;
          background-image: radial-gradient(circle at center, rgba(59,130,246,0.25) 0, rgba(59,130,246,0) 45%), repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 20px), linear-gradient(120deg, rgba(15,23,42,0.8), rgba(15,23,42,0.95));
          opacity: 0.25;
          filter: blur(0.5px);
          z-index: 0;
        }
        .pipeline-cards {
          scroll-behavior: smooth;
          scrollbar-width: none;
        }
        .pipeline-cards::-webkit-scrollbar {
          display: none;
        }
        .pipeline-line {
          position: absolute;
          inset: 50% 3rem;
          height: 2px;
          transform: translateY(-50%);
          background: repeating-linear-gradient(
            90deg,
            rgba(56,189,248,0.75) 0,
            rgba(56,189,248,0.75) 12px,
            transparent 12px,
            transparent 24px
          );
          border-radius: 999px;
          animation: dashSlide 3.5s linear infinite;
          z-index: 1;
        }
        .pipeline-card {
          position: relative;
          z-index: 10;
        }
        .pipeline-card::after {
          content: '';
          position: absolute;
          right: -68px;
          top: 50%;
          width: 68px;
          border-top: 1.5px dashed rgba(59,130,246,0.6);
          opacity: 0.75;
          transform: translateY(-50%);
          pointer-events: none;
        }
        .pipeline-card:last-child::after {
          display: none;
        }
        @media (max-width: 1024px) {
          .pipeline-card::after {
            display: none;
          }
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
          opacity: 0.5;
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
          100% { background-position: 120px 0; }
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

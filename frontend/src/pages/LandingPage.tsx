import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useMemo, useRef, useState } from 'react';

function useAnimatedStats(targets: { docs: number; approvals: number; sections: number }) {
  const [stats, setStats] = useState({ docs: 0, approvals: 0, sections: 0 });
  useEffect(() => {
    let animationFrame: number;
    let start: number | null = null;
    const duration = 2400;
    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 2);
      setStats({
        docs: Math.floor(targets.docs * progress),
        approvals: Math.floor(targets.approvals * progress),
        sections: Math.floor(targets.sections * progress),
      });
      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      }
    };
    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [targets.docs, targets.approvals, targets.sections]);
  return stats;
}

export default function LandingPage() {
  const { token, initializing } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<HTMLDivElement[]>([]);

  const stats = useAnimatedStats({
    docs: 1289,
    approvals: 342,
    sections: 214,
  });

  const pipeline = useMemo(
    () => [
      { title: 'Evidence intake', icon: '📥', detail: 'Import docs, prompts, and models.' },
      { title: 'Doc generation', icon: '🧾', detail: 'Auto-rotate templates for regulators.' },
      { title: 'Review & approve', icon: '✅', detail: 'Assign reviewers, lock sections.' },
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
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-tr from-sky-500/30 via-fuchsia-500/20 to-emerald-400/20 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-gradient-to-tr from-fuchsia-500/30 via-amber-400/20 to-sky-400/20 blur-3xl animate-blob animation-delay-2000" />
      <div className="pointer-events-none absolute left-1/3 bottom-0 h-64 w-64 rounded-full bg-gradient-to-tr from-emerald-400/30 via-sky-400/20 to-fuchsia-400/20 blur-3xl animate-blob animation-delay-4000" />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-12 px-6 py-24">
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <img
              src="/compliance-icon.svg"
              alt="NeuralDocx logo"
              className="h-12 w-12 rounded-xl border border-white/40 bg-white/10 p-2"
            />
            <p className="text-sm uppercase tracking-wide text-sky-400">
              NeuralDocx — your AI trust platform
            </p>
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-white via-sky-200 to-white bg-clip-text text-4xl font-semibold leading-tight text-transparent md:text-5xl">
              Documentation automation for responsible AI programs.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-200">
              Capture system archive and processes, generate regulator-friendly sections, and keep every doc up to date with reviewer approval flows.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              to="/signup"
              className="group rounded-md bg-sky-500 px-6 py-3 text-base font-semibold text-white shadow transition-transform hover:-translate-y-0.5 hover:bg-sky-400 hover:shadow-sky-500/30"
            >
              Get Started
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
            <Link
              to="/login"
              className="rounded-md border border-white/30 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10 hover:backdrop-blur-sm"
            >
              Log In
            </Link>
            <a
              href="https://calendly.com/neuraldocx"
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-white/30 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10 hover:backdrop-blur-sm"
            >
              Book a demo
            </a>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-white/20 hover:shadow-xl hover:shadow-sky-500/10">
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
    

        <div className="relative mt-6 rounded-[32px] border border-white/5 bg-[#050911] p-6 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.35),transparent_45%)] blur-3xl opacity-70" />
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.05)_0,rgba(255,255,255,0.05)_2px,transparent_2px,transparent_24px)]" />
          <div className="pipeline grid relative gap-6 lg:grid-cols-3">
            {pipeline.map((segment, idx) => (
              <div
                key={segment.title}
                className={`pipeline-card relative flex flex-col items-start gap-3 overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-[#0c1b33] to-[#0f172a] p-5 text-slate-100 animate-pulse-card transition-transform duration-500 ${activeStep === idx ? 'scale-105 border-sky-400 shadow-[0_25px_60px_rgba(14,165,233,0.35)]' : ''}`}
                data-step={idx}
                ref={(el) => {
                  stepRefs.current[idx] = el!;
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs uppercase tracking-widest text-slate-400">Step {idx + 1}</span>
                  <span className="text-3xl">{segment.icon}</span>
                </div>
                <h3 className="text-2xl font-semibold text-white">{segment.title}</h3>
                <p className="text-sm text-slate-300">{segment.detail}</p>
                <div className="h-1 w-full rounded-full bg-gradient-to-r from-sky-500 via-emerald-400 to-fuchsia-500 opacity-70" />
                <div className="absolute -right-6 bottom-4 h-10 w-10 rounded-full border border-white/20 bg-gradient-to-br from-sky-500/30 to-fuchsia-500/30 blur-2xl drop-shadow-xl" />
                <span className="pipeline-progress" />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { label: 'Docs processed', value: stats.docs },
            { label: 'Approvals completed', value: stats.approvals },
            { label: 'Sections created', value: stats.sections },
            { label: 'AI systems created', value: stats.aiSystems },
          ].map((stat) => {
            const value =
              typeof stat.value === 'number' && Number.isFinite(stat.value)
                ? stat.value
                : 0;
            return (
              <div
                key={stat.label}
                className="relative rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 shadow-lg shadow-sky-500/10 backdrop-blur"
              >
                <p className="text-xs uppercase tracking-wide text-slate-400">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {value.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
        
        {/* Pricing */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-white/20 hover:shadow-xl hover:shadow-sky-500/10">
          <p className="text-sm uppercase tracking-wide text-slate-300">Pricing</p>
          <h2 className="mt-2 text-2xl font-semibold">Simple plans that scale with you</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {/* Free */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-white/20 hover:shadow-lg hover:shadow-sky-500/10">
              <p className="text-lg font-semibold">Free</p>
              <p className="mt-1 text-3xl font-bold">$0</p>
              <ul className="mt-3 space-y-1 text-slate-200 text-sm">
                <li>• 3 documents per month</li>
                <li>• 10 trust analyses per month</li>
                <li>• Evidence attachments</li>
              </ul>
              <Link to="/signup" className="mt-4 inline-block rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400">Get started</Link>
            </div>
            {/* Pro */}
            <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-5 ring-1 ring-inset ring-sky-500/20 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-500/20">
              <p className="text-lg font-semibold">Pro</p>
              <p className="mt-1 text-3xl font-bold">$49<span className="text-base font-normal">/mo</span></p>
              <ul className="mt-3 space-y-1 text-slate-200 text-sm">
                <li>• 25 documents per month</li>
                <li>• 250 trust analyses per month</li>
                <li>• All Free features</li>
                <li>• Priority support</li>
              </ul>
              <Link to="/signup" className="mt-4 inline-block rounded-md bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white">Start Pro</Link>
            </div>
            {/* Enterprise */}
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

      {/* Local styles for subtle blob animation */}
        <style>{`
          @keyframes blob { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(10px,-10px) scale(1.05);} 66% { transform: translate(-10px,10px) scale(0.98);} }
          .animate-blob { animation: blob 12s infinite; }
          .animation-delay-2000 { animation-delay: 2s; }
          .animation-delay-4000 { animation-delay: 4s; }
          .pipeline {
            position: relative;
          }
          .pipeline::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 6%;
            right: 6%;
            height: 2px;
            background-image: repeating-linear-gradient(
              90deg,
              rgba(255,255,255,0.3) 0,
              rgba(255,255,255,0.3) 20px,
              transparent 20px,
              transparent 40px
            );
            animation: dashSlide 3s linear infinite;
          }
          .pipeline-card {
            animation: floatCard 6s ease-in-out infinite;
          }
          .pipeline-progress {
            position: absolute;
            inset: 0;
            background: radial-gradient(circle, rgba(59,130,246,0.25), transparent 60%);
            animation: pulseGlow 4s ease-in-out infinite;
          }
          @keyframes dashSlide {
            0% { background-position: 0 0; }
            100% { background-position: 80px 0; }
          }
          @keyframes floatCard {
            0% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
            100% { transform: translateY(0); }
          }
          @keyframes pulseGlow {
            0% { opacity: 0.15; }
            50% { opacity: 0.35; }
            100% { opacity: 0.15; }
          }
        `}</style>
    </div>
  );
}

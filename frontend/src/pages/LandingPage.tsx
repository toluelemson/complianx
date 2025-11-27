import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from 'react';
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
  const [cardWidth, setCardWidth] = useState(0);
  const CARD_GAP_PX = 20;
  const DRAG_THRESHOLD = 34;
  const WHEEL_THROTTLE_MS = 250;
  const WHEEL_DELTA_THRESHOLD = 12;
  const pointerStartXRef = useRef<number | null>(null);
  const lastWheelTimeRef = useRef(0);

  const summaryQuery = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => api.get('/analytics/summary').then((res) => res.data),
  });

  const stats = useAnimatedStats(
    summaryQuery.data ?? { docs: 0, approvals: 0, sections: 0, aiSystems: 0 },
  );

  const pipeline = useMemo(
    () => [
      {
        title: 'Evidence intake',
        icon: '📥',
        detail: 'Upload prompts, policies, and proof so every document starts with a clear audit trail.',
      },
      {
        title: 'Doc generation',
        icon: '🧾',
        detail: 'Auto-draft compliance notes that reference the rules and context your team cares about.',
      },
      {
        title: 'Review & approve',
        icon: '✅',
        detail: 'Invite reviewers, gather approvals, and keep each comment attached to the right section.',
      },
      {
        title: 'Release notes',
        icon: '📝',
        detail: 'Bundle summaries and approvals together, then export for regulators or teammates.',
      },
      {
        title: 'Trust monitoring',
        icon: '🛰️',
        detail: 'Watch performance and drift so you can update documentation before questions arrive.',
        comingSoon: true,
      },
    ],
    [],
  );
  const goPrevStep = useCallback(
    () => setActiveStep((prev) => (prev - 1 + pipeline.length) % pipeline.length),
    [pipeline.length],
  );
  const goNextStep = useCallback(
    () => setActiveStep((prev) => (prev + 1) % pipeline.length),
    [pipeline.length],
  );
  const updateCardWidth = useCallback(() => {
    const firstCard = stepRefs.current[0];
    if (firstCard) {
      setCardWidth(firstCard.offsetWidth);
    }
  }, []);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    pointerStartXRef.current = event.clientX;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const startX = pointerStartXRef.current;
      if (startX === null) return;
      const delta = event.clientX - startX;
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      if (delta > 0) {
        goPrevStep();
      } else {
        goNextStep();
      }
      pointerStartXRef.current = event.clientX;
    },
    [goNextStep, goPrevStep],
  );

  const releasePointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
    pointerStartXRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      const now = performance.now();
      if (now - lastWheelTimeRef.current < WHEEL_THROTTLE_MS) return;

      const activeDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      if (Math.abs(activeDelta) < WHEEL_DELTA_THRESHOLD) return;

      lastWheelTimeRef.current = now;
      if (activeDelta > 0) {
        goNextStep();
      } else {
        goPrevStep();
      }
    },
    [goNextStep, goPrevStep],
  );

  useEffect(() => {
    const interval = setInterval(goNextStep, 6500);
    return () => clearInterval(interval);
  }, [goNextStep]);
  useEffect(() => {
    updateCardWidth();
    window.addEventListener('resize', updateCardWidth);
    return () => window.removeEventListener('resize', updateCardWidth);
  }, [updateCardWidth]);

  if (!initializing && token) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-tr from-sky-500/25 via-slate-400/20 to-emerald-400/20 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-gradient-to-tr from-fuchsia-500/30 via-amber-400/20 to-sky-400/20 blur-3xl animate-blob animation-delay-2000" />
      <div className="pointer-events-none absolute left-1/3 bottom-0 h-64 w-64 rounded-full bg-gradient-to-tr from-emerald-400/25 via-sky-400/20 to-fuchsia-400/20 blur-3xl animate-blob animation-delay-4000" />
      <div className="relative mx-auto max-w-7xl px-8 py-24">
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
              <h1 className="relative overflow-hidden bg-gradient-to-r from-white via-sky-200 to-white bg-clip-text text-4xl font-black leading-tight text-transparent md:text-5xl">
                Build trustworthy AI docs in minutes.
                <span className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-sky-400/80 via-emerald-400/60 to-fuchsia-500/70 opacity-70 animate-pulse" />
              </h1>
              <p className="mt-4 max-w-2xl text-lg font-semibold text-slate-200">
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
              <a
                href="https://calendly.com/neuraldocx/demo"
                target="_blank"
                rel="noreferrer"
              className="rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-white/90 transition hover:border-white/50"
              >
                Book a demo
              </a>
            </div>
          </div>
          <div className="pipeline-panel relative z-10 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/90 to-slate-950/80 p-6 shadow-2xl shadow-sky-500/20">
            <div className="network-grid" aria-hidden />
            <div className="pipeline-line" aria-hidden />
            <div className="pipeline-cards relative overflow-hidden">
              <div
                className="flex gap-5 px-2 pb-1 pt-2 transition-transform duration-700 ease-out"
                style={{
                  transform: `translateX(-${activeStep * (cardWidth + CARD_GAP_PX)}px)`,
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={releasePointer}
                onPointerCancel={releasePointer}
                onPointerLeave={releasePointer}
                onWheel={handleWheel}
              >
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
              <div className="mt-4 relative z-20 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-400">
                <span>
                  Step {activeStep + 1} of {pipeline.length}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={goPrevStep}
                    className="pointer-events-auto rounded-full border border-slate-600 px-3 py-1 text-[10px] font-semibold text-slate-200 transition hover:border-white"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={goNextStep}
                    className="pointer-events-auto rounded-full border border-slate-600 px-3 py-1 text-[10px] font-semibold text-slate-200 transition hover:border-white"
                  >
                    Next
                  </button>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.4em] text-slate-300">
              <span className="rounded-full border border-white/20 px-4 py-1">Evidence sources</span>
              <span className="rounded-full border border-white/20 px-4 py-1">Live compliance stats</span>
              <span className="rounded-full border border-white/20 px-4 py-1">Trust insights soon</span>
            </div>
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
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Audit readiness</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Evidence trails for regulators</h3>
            <p className="mt-2 text-slate-300">
              Approvals, prompts, and derivations in one timeline ensure every AI doc carries context auditors expect.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.4em] text-slate-200">
              <span className="rounded-full bg-white/10 px-3 py-1">EU AI Act</span>
              <span className="rounded-full bg-white/10 px-3 py-1">NIST AI RMF</span>
              <span className="rounded-full bg-white/10 px-3 py-1">SOC 2</span>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200 shadow-lg shadow-emerald-500/10 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Workflow visibility</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Know what to finish</h3>
            <p className="mt-2 text-slate-300">
              Spot drafts and waiting approvals so you can clear the next blocker.
            </p>
            <p className="mt-4 text-sm text-slate-300">
              Personal workspaces feed company views so leads always know where to follow up.
            </p>
          </div>
        </div>
        <div className="mt-10 relative z-10">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-white/20 hover:shadow-xl hover:shadow-sky-500/10">
            <p className="text-sm uppercase tracking-wide text-slate-300">Pricing & workspaces</p>
            <h2 className="mt-2 text-2xl font-semibold">Choose a workspace sized for your team</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-white/20 hover:shadow-lg hover:shadow-sky-500/10">
                <p className="text-lg font-semibold">Starter</p>
                <p className="mt-1 text-3xl font-bold">$0</p>
                <ul className="mt-3 space-y-1 text-slate-200 text-sm">
                  <li>• Personal workspace + solo dashboard</li>
                  <li>• Three compliance documents per month</li>
                  <li>• Evidence attachments + version history</li>
                </ul>
                <Link to="/signup?type=personal" className="mt-4 inline-block rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400">
                  Start personal workspace
                </Link>
              </div>
              <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-5 ring-1 ring-inset ring-sky-500/20 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-500/20">
                <p className="text-lg font-semibold">Team</p>
                <p className="mt-1 text-3xl font-bold">
                  $49<span className="text-base font-normal">/mo</span>
                </p>
                <ul className="mt-3 space-y-1 text-slate-200 text-sm">
                  <li>• Shared company workspace & approvals</li>
                  <li>• 25 documents + 250 compliance reviews per month</li>
                  <li>• Slack/Teams notifications & priority support</li>
                </ul>
                <Link to="/signup?type=company" className="mt-4 inline-block rounded-md bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white">
                  Start team workspace
                </Link>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-white/20 hover:shadow-lg hover:shadow-sky-500/10">
                <p className="text-lg font-semibold">Enterprise</p>
                <p className="mt-1 text-3xl font-bold">Custom</p>
                <ul className="mt-3 space-y-1 text-slate-200 text-sm">
                  <li>• Unlimited documents, projects, and integrations</li>
                  <li>• Dedicated compliance advisor & SSO/SAML</li>
                  <li>• API access + audit logs for regulators</li>
                </ul>
                <Link to="/contact" className="mt-4 inline-block rounded-md border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
                  Contact sales
                </Link>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-300">Workspace upgrades unlock more reviewers, evidence storage, and convenience features.</p>
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
          position: relative;
          z-index: 5;
          scroll-behavior: smooth;
          scrollbar-width: none;
          touch-action: pan-y;
          cursor: grab;
        }
        .pipeline-cards:active {
          cursor: grabbing;
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
          z-index: 0;
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

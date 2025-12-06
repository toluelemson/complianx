import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
  const [carouselOffset, setCarouselOffset] = useState(0);
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
        detail: 'Pull in prompts, policies, and proof for a clean trail.',
      },
      {
        title: 'Doc generation',
        icon: '🧾',
        detail: 'Auto-draft notes tied to the rules you set.',
      },
      {
        title: 'Review & approve',
        icon: '✅',
        detail: 'Assign reviewers and lock approvals to each section.',
      },
      {
        title: 'Release notes',
        icon: '📝',
        detail: 'Ship tidy summaries that export in one click.',
      },
      {
        title: 'Trust monitoring',
        icon: '🛰️',
        detail: 'Watch drift and update docs before questions arrive.',
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
  const updateCardMetrics = useCallback(() => {
    const refs = stepRefs.current;
    if (refs.length === 0) {
      setCardWidth(0);
      return;
    }
    const firstCard = refs[0];
    setCardWidth(firstCard?.offsetWidth ?? 0);
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

  useLayoutEffect(() => {
    updateCardMetrics();
  }, [updateCardMetrics, pipeline.length]);

  useEffect(() => {
    const interval = setInterval(goNextStep, 6500);
    return () => clearInterval(interval);
  }, [goNextStep]);
  useEffect(() => {
    updateCardMetrics();
    window.addEventListener('resize', updateCardMetrics);
    return () => window.removeEventListener('resize', updateCardMetrics);
  }, [updateCardMetrics]);
  useEffect(() => {
    const activeCard = stepRefs.current[activeStep];
    const offset =
      activeCard?.offsetLeft ?? activeStep * (cardWidth + CARD_GAP_PX);
    setCarouselOffset(offset);
  }, [activeStep, cardWidth]);

  if (!initializing && token) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-slate-50 to-white text-slate-900 font-sans">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-tr from-sky-50 via-slate-50 to-emerald-50 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-gradient-to-tr from-amber-100 via-sky-50 to-emerald-50 blur-3xl animate-blob animation-delay-2000" />
      <div className="pointer-events-none absolute left-1/3 bottom-0 h-64 w-64 rounded-full bg-gradient-to-tr from-emerald-50 via-sky-50 to-cyan-50 blur-3xl animate-blob animation-delay-4000" />
      <div className="relative mx-auto max-w-7xl px-8 py-24">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8 relative z-10">
            <div className="flex items-center gap-4">
              <img
                src="/compliance-icon.svg"
                alt="NeuralDocx logo"
                className="h-12 w-12 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
              />
              <p className="text-sm uppercase tracking-wide text-sky-800">
                NeuralDocx — documentation + trust
              </p>
            </div>
            <div>
              <h1 className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-sky-800 to-emerald-800 bg-clip-text text-4xl font-black leading-tight text-transparent md:text-5xl">
                Build trustworthy AI docs in minutes.
                <span className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-sky-300 via-cyan-200 to-emerald-200 opacity-80 animate-pulse" />
              </h1>
              <p className="mt-4 max-w-2xl text-lg font-semibold text-slate-700">
                Collect prompts, evidence, and approvals in a single workflow so regulators always see what they expect.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs uppercase tracking-[0.35em] text-slate-600">
                <span className="rounded-full border border-slate-200 px-3 py-1 text-[10px] bg-white shadow-sm">
                  EU AI Act
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1 text-[10px] bg-white shadow-sm">
                  NIST AI RMF
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1 text-[10px] bg-white shadow-sm">
                  SOC 2
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/login"
                className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-800 transition hover:border-sky-400 hover:text-sky-700 bg-white shadow-sm"
              >
                Log in
              </Link>
              <Link
                to="/signup?type=personal"
                className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 shadow-sm"
              >
                Create personal workspace
              </Link>
              <a
                href="https://calendly.com/neuraldocx"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-800 transition hover:border-sky-400 hover:text-sky-700 bg-white shadow-sm"
              >
                Book a demo
              </a>
            </div>
          </div>
          <div className="pipeline-panel relative z-10 overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-6 shadow-xl shadow-slate-200/80">
            <div className="network-grid" aria-hidden />
            <div className="pipeline-line" aria-hidden />
            <div className="pipeline-cards relative overflow-hidden">
              <div
                className="flex gap-5 px-2 pb-1 pt-2 transition-transform duration-700 ease-out"
                style={{
                  transform: `translateX(-${carouselOffset}px)`,
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
                    className={`pipeline-card relative z-10 min-w-[200px] flex-1 flex-col gap-3 rounded-[24px] border bg-white p-5 text-slate-900 transition duration-500 shadow-sm ${
                      isActive
                        ? 'active border-sky-400/70 shadow-2xl shadow-sky-100/70 scale-105 animate-pulse-card'
                        : 'border-slate-200 hover:shadow-md'
                    }`}
                    onClick={() => setActiveStep(idx)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[0.6rem] uppercase tracking-[0.45em] text-slate-600">
                        Step {idx + 1}
                      </span>
                      <span className="text-3xl">{segment.icon}</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-slate-900">{segment.title}</h3>
                    <p className="text-sm text-slate-600">{segment.detail}</p>
                    {segment.comingSoon && (
                      <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-[10px] uppercase tracking-[0.45em] text-slate-700 bg-slate-50">
                        Coming soon
                      </span>
                    )}
                    <div className="mt-3 h-1 w-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 opacity-85" />
                    <div className="absolute -right-5 bottom-4 h-10 w-10 rounded-full border border-slate-200 bg-gradient-to-br from-sky-100 to-emerald-100 blur-2xl" />
                    <span className="pipeline-progress" />
                  </div>
                );
              })}
              </div>
              <div className="mt-4 relative z-20 flex items-center justify-between text-xs uppercase tracking-[0.35em] text-slate-600">
                <span>
                  Step {activeStep + 1} of {pipeline.length}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={goPrevStep}
                    className="pointer-events-auto rounded-full border border-slate-300 px-3 py-1 text-[10px] font-semibold text-slate-800 transition hover:border-sky-400 hover:text-sky-700 bg-white shadow-sm"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={goNextStep}
                    className="pointer-events-auto rounded-full border border-slate-300 px-3 py-1 text-[10px] font-semibold text-slate-800 transition hover:border-sky-400 hover:text-sky-700 bg-white shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 relative z-10">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-600">STATS</p>
                <h3 className="text-xl font-semibold text-slate-900">Momentum at a glance</h3>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              {[
                { label: 'Docs processed', value: stats.docs, accent: 'from-sky-500/30 to-sky-300/40' },
                { label: 'Reviews done', value: stats.approvals, accent: 'from-emerald-500/30 to-emerald-300/40' },
                { label: 'Sections captured', value: stats.sections, accent: 'from-cyan-500/30 to-cyan-300/40' },
                { label: 'AI setups tracked', value: stats.aiSystems, accent: 'from-amber-400/30 to-amber-200/40' },
              ].map((stat) => {
                const value = Number.isFinite(stat.value) ? stat.value : 0;
                return (
                  <div
                    key={stat.label}
                    className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.accent}`} />
                    <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">{value.toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-10 relative z-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-sky-200 hover:shadow-xl hover:shadow-slate-200">
            <p className="text-sm uppercase tracking-wide text-slate-600">Pricing & workspaces</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Choose a workspace sized for your team</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg hover:shadow-slate-200">
                <p className="text-lg font-semibold text-slate-900">Starter</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">$0</p>
                <ul className="mt-3 space-y-1 text-slate-700 text-sm">
                  <li>• Personal workspace</li>
                  <li>• 3 docs / month</li>
                  <li>• Evidence + history</li>
                </ul>
                <Link to="/signup?type=personal" className="mt-4 inline-block rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400">
                  Start personal workspace
                </Link>
              </div>
              <div className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-sky-50 p-5 ring-1 ring-inset ring-sky-100 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-200">
                <p className="text-lg font-semibold text-slate-900">Pro</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  $49<span className="text-base font-normal">/mo</span>
                </p>
                <ul className="mt-3 space-y-1 text-slate-700 text-sm">
                  <li>• Shared workspace</li>
                  <li>• 25 docs + 250 reviews</li>
                  <li>• Alerts + priority support</li>
                </ul>
                <Link to="/signup?type=company" className="mt-4 inline-block rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 shadow-sm">
                  Start pro workspace
                </Link>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg hover:shadow-slate-200">
                <p className="text-lg font-semibold text-slate-900">Enterprise</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">Custom</p>
                <ul className="mt-3 space-y-1 text-slate-700 text-sm">
                  <li>• Unlimited docs & integrations</li>
                  <li>• Dedicated advisor + SSO/SAML</li>
                  <li>• API + audit logs</li>
                </ul>
                <Link to="/contact" className="mt-4 inline-block rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:border-sky-300 hover:text-sky-700 bg-white shadow-sm">
                  Contact sales
                </Link>
              </div>
            </div>
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
          background-image: radial-gradient(circle at center, rgba(59,130,246,0.15) 0, rgba(59,130,246,0) 45%), repeating-linear-gradient(90deg, rgba(148,163,184,0.2) 0 1px, transparent 1px 20px), linear-gradient(120deg, rgba(255,255,255,0.9), rgba(248,250,252,0.95));
          opacity: 0.3;
          filter: blur(0.25px);
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
            rgba(56,189,248,0.55) 0,
            rgba(56,189,248,0.55) 12px,
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
          border-top: 1.5px dashed rgba(59,130,246,0.45);
          opacity: 0.6;
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
          background: linear-gradient(120deg, rgba(56,189,248,0.12), transparent 65%);
          opacity: 0;
          transition: opacity 0.6s;
        }
        .pipeline-card:hover::before,
        .pipeline-card.active::before {
          opacity: 0.28;
        }
        .pipeline-progress {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, rgba(14,165,233,0.16), transparent 65%);
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

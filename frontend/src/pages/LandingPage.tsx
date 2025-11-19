import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { token, initializing } = useAuth();
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
        <div>
          <p className="text-sm uppercase tracking-wide text-sky-400">AI Trust Platform</p>
          <h1 className="mt-4 bg-gradient-to-r from-white via-sky-200 to-white bg-clip-text text-4xl font-semibold leading-tight text-transparent md:text-5xl">
            Documentation + Trust Monitoring for responsible AI teams.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-200">
            Capture system details and generate compliance‑ready documents, then
            continuously assess fairness, robustness, and data drift — in one
            workspace. Evidence, reviewer workflow, and PDF exports included.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/signup"
              className="group rounded-md bg-sky-500 px-6 py-3 text-base font-semibold text-white shadow transition-transform hover:-translate-y-0.5 hover:bg-sky-400 hover:shadow-sky-500/30"
            >
              Get Started
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              to="/login"
              className="rounded-md border border-white/30 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10 hover:backdrop-blur-sm"
            >
              Log In
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-white/20 hover:shadow-xl hover:shadow-sky-500/10">
          <p className="text-sm uppercase tracking-wide text-slate-300">What you can do</p>
          <ul className="mt-4 grid gap-3 text-slate-100 sm:grid-cols-2">
            <li className="transition hover:text-white/90">✔ EU AI Act technical documentation generator</li>
            <li className="transition hover:text-white/90">✔ Model cards and risk assessments</li>
            <li className="transition hover:text-white/90">✔ Trust monitoring: fairness, robustness, drift, cohorts</li>
            <li className="transition hover:text-white/90">✔ Evidence uploads with reviewer approval workflow</li>
            <li className="transition hover:text-white/90">✔ PDF exports with Evidence Appendix</li>
            <li className="transition hover:text-white/90">✔ Notifications, usage‑based limits, simple billing</li>
          </ul>
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
              <a href="mailto:sales@example.com" className="mt-4 inline-block rounded-md border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">Contact sales</a>
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
      `}</style>
    </div>
  );
}

// Marketing route.
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthContext';
import { Hero } from '@/domains/marketing/components/Hero';
import { FaqSection } from '@/domains/marketing/components/FaqSection';
import { Navbar } from '@/domains/marketing/components/Navbar';
import { PricingSection } from '@/domains/marketing/components/PricingSection';
import { CTASection } from '@/domains/marketing/components/CTASection';
import { TrialModal } from '@/domains/marketing/components/TrialModal';
import { VideoSection } from '@/domains/marketing/components/VideoSection';

const DEMO_VIDEO_SRC = '/neuraldocx-hero.webm';

export default function LandingPage() {
  const { token, initializing } = useAuth();
  const [trialModalOpen, setTrialModalOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTrialModalOpen(true);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, []);

  if (!initializing && token) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white">
      <Navbar />

      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[56rem] bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.09),_transparent_26%),linear-gradient(180deg,_#0a0c10_0%,_#11151b_72%,_#0f131a_100%)]" />
        <div className="pointer-events-none absolute left-[12%] top-24 h-36 w-36 rounded-full bg-slate-300/6 blur-3xl" />
        <div className="pointer-events-none absolute right-[12%] top-20 h-40 w-40 rounded-full bg-slate-500/8 blur-3xl" />

        <main className="relative z-10">
          <Hero />
          <VideoSection
            onOpenTrial={() => setTrialModalOpen(true)}
            videoSrc={DEMO_VIDEO_SRC}
          />
          {/* <Capabilities /> */}
          <PricingSection />
          <FaqSection />
          <CTASection />
        </main>
      </div>

      <TrialModal
        isOpen={trialModalOpen}
        onClose={() => setTrialModalOpen(false)}
      />
    </div>
  );
}

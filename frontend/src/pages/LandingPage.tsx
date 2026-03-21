import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Hero } from '@/components/landing/Hero';
import { FaqSection } from '@/components/landing/FaqSection';
import { Navbar } from '@/components/landing/Navbar';
import { PricingSection } from '@/components/landing/PricingSection';
import { CTASection } from '@/components/landing/CTASection';
import { TrialModal } from '@/components/landing/TrialModal';
import { VideoSection } from '@/components/landing/VideoSection';

const DEMO_VIDEO_SRC =
  'https://cdn.pixabay.com/video/2019/05/05/23325-334689174_medium.mp4';

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

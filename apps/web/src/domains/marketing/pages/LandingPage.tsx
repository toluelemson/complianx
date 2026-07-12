// Marketing route.
import { useEffect, useRef, useState } from 'react';
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
const TRIAL_MODAL_DISMISSED_UNTIL_KEY = 'neuraldocx_trial_modal_dismissed_until';
const TRIAL_MODAL_CONVERTED_KEY = 'neuraldocx_trial_modal_converted';
const DISMISSAL_WINDOW_MS = 1000 * 60 * 60 * 24 * 14;

type TrialModalSource = 'video' | 'exit' | 'scroll';

function isTrialModalSuppressed() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (window.localStorage.getItem(TRIAL_MODAL_CONVERTED_KEY) === 'true') {
    return true;
  }

  const dismissedUntil = window.localStorage.getItem(
    TRIAL_MODAL_DISMISSED_UNTIL_KEY,
  );

  if (!dismissedUntil) {
    return false;
  }

  return Number(dismissedUntil) > Date.now();
}

export default function LandingPage() {
  const { token, initializing } = useAuth();
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [trialModalSource, setTrialModalSource] =
    useState<TrialModalSource>('scroll');
  const autoTriggerConsumedRef = useRef(false);

  const openTrialModal = (source: TrialModalSource, force = false) => {
    if (!force && (autoTriggerConsumedRef.current || isTrialModalSuppressed())) {
      return;
    }

    if (!force) {
      autoTriggerConsumedRef.current = true;
    }

    setTrialModalSource(source);
    setTrialModalOpen(true);
  };

  const closeTrialModal = () => {
    setTrialModalOpen(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        TRIAL_MODAL_DISMISSED_UNTIL_KEY,
        String(Date.now() + DISMISSAL_WINDOW_MS),
      );
    }
  };

  const markTrialConversion = () => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(TRIAL_MODAL_CONVERTED_KEY, 'true');
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const isDesktop =
      window.innerWidth >= 1024 &&
      window.matchMedia('(pointer:fine)').matches;

    if (!isDesktop || isTrialModalSuppressed()) {
      return;
    }

    const onMouseOut = (event: MouseEvent) => {
      if (event.relatedTarget || event.clientY > 0) {
        return;
      }
      openTrialModal('exit');
    };

    const onScroll = () => {
      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight <= 0) {
        return;
      }
      const progress = window.scrollY / scrollableHeight;
      if (progress >= 0.6) {
        openTrialModal('scroll');
      }
    };

    document.addEventListener('mouseout', onMouseOut);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      document.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('scroll', onScroll);
    };
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
            onOpenTrial={() => openTrialModal('video', true)}
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
        onClose={closeTrialModal}
        source={trialModalSource}
        onPrimaryAction={markTrialConversion}
        onSecondaryAction={markTrialConversion}
      />
    </div>
  );
}

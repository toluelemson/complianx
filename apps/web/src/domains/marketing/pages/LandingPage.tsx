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
import { trackMarketingEvent } from '@/platform/analytics/marketing';

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
    trackMarketingEvent('marketing_trial_modal_opened', {
      auto_triggered: !force,
      source,
    });
  };

  const closeTrialModal = () => {
    setTrialModalOpen(false);
    trackMarketingEvent('marketing_trial_modal_dismissed', {
      source: trialModalSource,
    });
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
    trackMarketingEvent('marketing_trial_modal_converted', {
      source: trialModalSource,
    });
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
    <div className="min-h-screen bg-[var(--cx-canvas)] text-[var(--cx-text)]">
      <Navbar />

      <main className="relative z-10">
          <Hero />
          <VideoSection
            onOpenTrial={() => openTrialModal('video', true)}
            videoSrc={DEMO_VIDEO_SRC}
          />
          <PricingSection />
          <FaqSection />
          <CTASection />
      </main>

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

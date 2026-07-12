import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  Clock3,
  FolderKanban,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { trackMarketingEvent } from '@/platform/analytics/marketing';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { buildSubmitSystemHref } from '../lib/submit-system';

interface TrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  source?: 'video' | 'exit' | 'scroll';
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}

const FEATURE_LIST = [
  {
    title: 'Done-for-you docs',
    detail: 'We prepare the first pack for you.',
    icon: ClipboardCheck,
    accent: 'bg-cyan-500/12 text-cyan-200 ring-cyan-400/20',
  },
  {
    title: '48hr turnaround',
    detail: 'First delivery can land in two days.',
    icon: Clock3,
    accent: 'bg-blue-500/12 text-blue-200 ring-blue-400/20',
  },
  {
    title: 'Risk + controls',
    detail: 'Built for real audit and review work.',
    icon: ShieldCheck,
    accent: 'bg-emerald-500/12 text-emerald-200 ring-emerald-400/20',
  },
  {
    title: 'Clear workflow',
    detail: 'Submit, scope, review, deliver.',
    icon: FolderKanban,
    accent: 'bg-violet-500/12 text-violet-200 ring-violet-400/20',
  },
];

export function TrialModal({
  isOpen,
  onClose,
  source = 'scroll',
  onPrimaryAction,
  onSecondaryAction,
}: TrialModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const heading =
    source === 'video'
      ? 'Want us to prepare your first compliance pack?'
      : source === 'exit'
        ? 'Before you go, see the fastest way to start'
        : 'Start with NeuralDocx';
  const description =
    source === 'video'
      ? 'If the walkthrough looked close to your use case, send the system details and we can scope the first documentation pack for you.'
      : source === 'exit'
        ? 'Share the system details once and we can scope the first delivery without forcing your team into a long implementation cycle.'
        : 'AI compliance documentation with first delivery in as little as 48 hours.';
  const submitSourceByModalSource = {
    exit: 'trial_modal_exit',
    scroll: 'trial_modal_scroll',
    video: 'trial_modal_video',
  } as const;

  return (
    <div
      className="animate-enter-fade fixed inset-0 z-50 flex items-center justify-center bg-[#020406]/72 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card
        onClick={(e) => e.stopPropagation()}
        className="animate-enter-scale w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#f7f8fc] shadow-[0_45px_120px_-48px_rgba(15,23,42,0.65)]"
      >
        <CardHeader className="border-b border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#eef3ff_100%)] p-5 pb-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-lg">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2D2E8F]/10 bg-[#2D2E8F]/6 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#5c6f98]">
                <img
                  src="/neuraldocx-logo.svg"
                  alt="NeuralDocx"
                  className="h-4 w-4 rounded-sm"
                />
                NeuralDocx
              </div>
              <CardTitle className="mt-4 text-3xl leading-[0.98] tracking-tight text-slate-950 sm:text-[2.6rem]">
                {heading}
              </CardTitle>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 sm:text-base">
                {description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.35)]">
                  48hr first draft
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] border border-slate-200 bg-white text-slate-500 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURE_LIST.map((item, index) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className={`animate-enter-up rounded-[1.1rem] border border-slate-200 bg-white p-3.5 shadow-[0_22px_50px_-36px_rgba(15,23,42,0.25)] animation-delay-${Math.min((index + 1) * 100, 500)}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${item.accent}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-base font-semibold tracking-tight text-slate-900">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-slate-600">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="animate-enter-up animation-delay-300 rounded-[1.1rem] border border-slate-200 bg-[#f3f6fb] p-3 shadow-[0_22px_50px_-36px_rgba(15,23,42,0.22)]">
            <div className="flex flex-col gap-3 lg:flex-row">
              <Button
                asChild
                size="lg"
                className="w-full bg-white px-7 text-black shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)] transition-transform duration-300 hover:-translate-y-0.5 hover:bg-[#F8FAFF] lg:flex-1"
              >
                <Link
                  to={buildSubmitSystemHref({
                    source: submitSourceByModalSource[source],
                  })}
                  onClick={() => {
                    trackMarketingEvent('marketing_submit_cta_clicked', {
                      source: submitSourceByModalSource[source],
                    });
                    onPrimaryAction?.();
                  }}
                >
                  Submit your system
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full border-slate-300 bg-white text-slate-900 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] transition-transform duration-300 hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950 lg:flex-1"
              >
                <a
                  href="https://calendly.com/neuraldocx"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    trackMarketingEvent('marketing_enterprise_cta_clicked', {
                      source: submitSourceByModalSource[source],
                    });
                    onSecondaryAction?.();
                  }}
                >
                  For enterprise, book a demo
                </a>
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500 lg:text-left">
              Takes about 3 minutes. No payment required.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

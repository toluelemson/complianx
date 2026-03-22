import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TrialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEATURE_LIST = [
  'Create audit-ready documentation',
  'Organize governance evidence',
  'Track risks and controls',
  'Standardize compliance workflows',
  'Support internal review and external audit preparation',
];

export function TrialModal({ isOpen, onClose }: TrialModalProps) {
  if (!isOpen) return null;

  return (
    <div className="animate-enter-fade fixed inset-0 z-50 flex items-center justify-center bg-[#020406]/72 px-4 backdrop-blur-sm">
      <Card className="animate-enter-scale w-full max-w-2xl rounded-[1.75rem] border-slate-200 bg-white shadow-[0_35px_100px_-40px_rgba(15,23,42,0.6)]">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                NeuralDocx
              </p>
              <CardTitle className="mt-4 text-4xl leading-tight text-slate-950">
                Start with NeuralDocx
              </CardTitle>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Generate compliance-ready AI documentation in minutes
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-8 pt-0">
          <div className="grid gap-3 sm:grid-cols-2">
            {FEATURE_LIST.map((item, index) => (
              <div
                key={item}
                className={`animate-enter-up rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 animation-delay-${Math.min((index + 1) * 100, 500)}`}
              >
                {item}
              </div>
            ))}
          </div>
          <div className="animate-enter-up animation-delay-300 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-white text-black transition-transform duration-300 hover:-translate-y-0.5 hover:bg-[#F3F6FF]">
              <Link to="/submit-system">Submit your system</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="transition-transform duration-300 hover:-translate-y-0.5"
            >
              <a
                href="https://calendly.com/neuraldocx"
                target="_blank"
                rel="noreferrer"
              >
                For enterprise, book a demo
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

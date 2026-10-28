import { Check } from 'lucide-react';

interface VideoSectionProps {
  onOpenTrial: () => void;
  videoSrc?: string;
}

export function VideoSection({ onOpenTrial, videoSrc }: VideoSectionProps) {
  const isGif = videoSrc?.toLowerCase().endsWith('.gif');

  return (
    <section id="solutions" className="hidden w-full border-y border-[#e8e8e8] bg-[#fafafa] py-14 md:block">
      <div className="px-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row lg:items-center lg:gap-12">
          <div className="max-w-sm shrink-0 lg:w-[31%]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a8a8a]">Audit-ready records</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#383838]">Everything needed for the next review.</h2>
            <p className="mt-4 text-sm leading-6 text-[#5e5e5e]">Keep the system story, evidence, and decisions together from intake to sign-off.</p>
            <div className="mt-6 space-y-3">
              {['System context', 'Obligations and evidence', 'Review history'].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm font-medium text-[#383838]">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e9fcf0] text-[#17a64e]">
                    <Check className="h-3 w-3" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="animate-enter-up min-w-0 flex-1 overflow-hidden rounded-[6px] border border-[#dbdbdb] bg-white shadow-[0_1px_3px_rgba(0,0,0,.1),0_1px_2px_rgba(0,0,0,.06)]">
          <div className="relative overflow-hidden rounded-[5px] bg-white">
            {videoSrc ? (
              <div className="relative mx-auto w-full max-w-[1100px]">
                {isGif ? (
                  <img
                    className="aspect-[2.2] w-full bg-black object-cover"
                    src={videoSrc}
                    alt="NeuralDocx product walkthrough"
                    loading="eager"
                  />
                ) : (
                  <video
                    className="aspect-[2.2] w-full bg-black object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                  >
                    <source src={videoSrc} />
                  </video>
                )}

              </div>
            ) : (
              <div className="mx-auto w-full max-w-[1100px]">
                <div className="relative aspect-[2.2] w-full">
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_40%,rgba(255,255,255,0.02))]" />
                  <div className="relative flex h-full items-center justify-center p-6 sm:p-8">
                    <div className="flex flex-col items-center gap-6">
                      <button
                        type="button"
                        onClick={onOpenTrial}
                        className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-white transition hover:scale-105 hover:bg-white/[0.12]"
                        aria-label="Open demo request"
                      >
                        <span className="ml-1 text-3xl">▶</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}

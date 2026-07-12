interface VideoSectionProps {
  onOpenTrial: () => void;
  videoSrc?: string;
}

export function VideoSection({ onOpenTrial, videoSrc }: VideoSectionProps) {
  const isGif = videoSrc?.toLowerCase().endsWith('.gif');

  return (
    <section id="solutions" className="hidden w-full pb-20 md:block">
      <div className="px-6 lg:px-10">
        <div className="animate-enter-up mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/14 bg-[linear-gradient(135deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.06)_45%,rgba(255,255,255,0.12)_100%)] p-2 shadow-[0_25px_80px_-35px_rgba(15,23,42,0.8)] backdrop-blur-xl">
          <div className="relative overflow-hidden rounded-[1.6rem] bg-[#0f141a]">
            <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.12),_transparent_32%),linear-gradient(180deg,_rgba(15,20,26,0.24)_0%,_rgba(15,20,26,0.72)_100%)]" />
            {videoSrc ? (
              <div className="relative mx-auto w-full max-w-[1100px]">
                {isGif ? (
                  <img
                    className="aspect-video w-full bg-black object-cover"
                    src={videoSrc}
                    alt="NeuralDocx product walkthrough"
                    loading="eager"
                  />
                ) : (
                  <video
                    className="aspect-video w-full bg-black object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                  >
                    <source src={videoSrc} />
                  </video>
                )}

                <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div />
                    <div className="animate-enter-fade rounded-full border border-white/20 bg-transparent px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.7)] backdrop-blur-md">
                      Audit-ready records
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-[1100px]">
                <div className="relative aspect-video w-full">
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
                      <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-slate-300">
                        NeuralDocx product walkthrough
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

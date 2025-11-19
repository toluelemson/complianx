interface DocumentPreviewModalProps {
  isOpen: boolean;
  title: string;
  url: string | null;
  isLoading: boolean;
  onClose: () => void;
}

export function DocumentPreviewModal({
  isOpen,
  title,
  url,
  isLoading,
  onClose,
}: DocumentPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">
              Preview
            </p>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
        <div className="h-[70vh] overflow-hidden p-6">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-slate-500">
              Loading preview...
            </div>
          ) : url ? (
            <iframe
              title={title}
              src={url}
              className="h-full w-full rounded-xl border border-slate-200"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500">
              Preview unavailable
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

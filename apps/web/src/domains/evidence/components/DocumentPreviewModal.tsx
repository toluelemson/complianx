// Evidence preview UI.
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4 backdrop-blur-sm">
      <Card className="w-full max-w-4xl rounded-[1.75rem] border-slate-200/90 bg-white/95 shadow-[0_35px_100px_-40px_rgba(15,23,42,0.45)]">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-400">
                Preview
              </p>
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
                {title}
              </h3>
            </div>
            <Button onClick={onClose} variant="outline" size="sm">
              Close
            </Button>
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
        </CardContent>
      </Card>
    </div>
  );
}

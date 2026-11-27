import { CircleHelp } from 'lucide-react';
import { useId, type ReactNode } from 'react';

export function HelpTooltip({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const tooltipId = useId();
  return (
    <span
      className={`group relative inline-flex align-middle ${className ?? ''}`}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        className="inline-flex rounded-full text-slate-400 outline-none hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-sky-600"
      >
        <CircleHelp aria-hidden="true" className="size-4" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute left-1/2 z-30 mt-6 w-64 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-left text-xs font-normal leading-5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {children}
      </span>
    </span>
  );
}

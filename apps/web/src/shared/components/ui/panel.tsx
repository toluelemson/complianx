import type { ReactNode } from 'react';

type PanelProps = {
  children: ReactNode;
  className?: string;
};

export function Panel({ children, className = '' }: PanelProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-6 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

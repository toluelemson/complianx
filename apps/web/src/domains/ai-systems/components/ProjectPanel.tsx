import type { ReactNode } from 'react';
import { Panel } from '@/shared/components/ui/panel';

type ProjectPanelProps = {
  children: ReactNode;
  className?: string;
};

export function ProjectPanel({ children, className = '' }: ProjectPanelProps) {
  return <Panel className={`hz-project-panel ${className}`}>{children}</Panel>;
}

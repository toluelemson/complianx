import { Link, Navigate, useParams } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';

const tools = [
  {
    label: 'Compliance traceability',
    description:
      'Connect system assets, permanent requirements, technical measures, documentation, evidence, and assessment coverage.',
    path: 'traceability',
  },
  {
    label: 'Compliance scoring',
    description:
      'Score requirements and keep versioned rationale and evidence links.',
    path: 'assessment',
  },
  {
    label: 'Project details',
    description:
      'Edit the complete documentation workspace and generated-document inputs.',
    path: 'compliance-workspace',
  },
  {
    label: 'Findings and actions',
    description: 'Track problems, owners, remediation, and review decisions.',
    path: 'findings',
  },
  {
    label: 'Messages',
    description:
      'Keep project questions, decisions, and review notes together.',
    path: 'messages',
  },
] as const;

export default function ProjectAdvancedPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { token, initializing } = useAuth();

  if (!initializing && !token) return <Navigate to="/login" replace />;

  return (
    <AppShell title="Advanced tools" projectId={projectId}>
      <div className="hz-console-content space-y-6">
        <Link
          to={`/projects/${projectId}/overview`}
          className="text-sm text-slate-500 hover:text-sky-600"
        >
          ← Project overview
        </Link>
        <div className="grid gap-4 md:grid-cols-2">
          {tools.map((tool) => (
            <Link
              key={tool.path}
              to={`/projects/${projectId}/${tool.path}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"
            >
              <h2 className="font-semibold text-slate-900">{tool.label}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {tool.description}
              </p>
              <span className="mt-4 inline-flex text-sm font-semibold text-sky-700">
                Open →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

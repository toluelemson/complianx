import { Link } from 'react-router-dom';

interface TrustWorkspaceBannerProps {
  projectId?: string;
}

export function TrustWorkspaceBanner({ projectId }: TrustWorkspaceBannerProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Trust monitoring</h3>
          <p className="mt-1 text-sm text-slate-600">
            Evidence upload and trust analytics now live on a dedicated workspace to keep NeuralDocx focused on writing.
          </p>
        </div>
        {projectId ? (
          <Link
            to={`/projects/${projectId}/trust`}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Open trust workspace
          </Link>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Need to add fairness samples or run drift checks? Jump to the Trust workspace without leaving your place here.
      </p>
    </div>
  );
}

import { Link } from 'react-router-dom';

export function SiteHeader() {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-semibold text-slate-900"
        >
          <img
            src="/compliance-icon.svg"
            alt="NeuralDocx"
            className="h-7 w-7 rounded-xl border border-slate-900/10 bg-white p-1 shadow-sm"
          />
          <span>NeuralDocx</span>
        </Link>
      </div>
    </div>
  );
}

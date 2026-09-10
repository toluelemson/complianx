// Auth domain route.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '@/platform/api/client';
import { SiteHeader } from '@/domains/marketing/components/SiteHeader';
import { Panel } from '@/shared/components/ui/panel';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [message, setMessage] = useState<string | undefined>();
  const [status, setStatus] = useState<
    'idle' | 'pending' | 'success' | 'error'
  >('idle');

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }
    setStatus('pending');
    api
      .post('/auth/verify-email', { token })
      .then(() => {
        setStatus('success');
        setMessage('Email verified! You can now log in.');
      })
      .catch((err: { response?: { data?: { message?: string } } }) => {
        setStatus('error');
        setMessage(
          err?.response?.data?.message ??
            'Unable to verify your email right now.',
        );
      });
  }, [token]);

  return (
    <>
      <SiteHeader />
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Panel className="w-full max-w-md p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">
            Email verification
          </h1>
          <p className="mt-4 text-sm text-slate-500">
            {status === 'pending'
              ? 'Validating your confirmation link...'
              : message}
          </p>
          {status !== 'pending' && (
            <Link
              to="/login"
              className="mt-6 inline-flex rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              Return to login
            </Link>
          )}
        </Panel>
      </div>
    </>
  );
}

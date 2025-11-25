import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { SiteHeader } from '../components/SiteHeader';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [message, setMessage] = useState<string | undefined>();
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>(
    'idle',
  );

  useEffect(() => {
    if (!token) {
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
      .catch((err: any) => {
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
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Email verification</h1>
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
      </div>
    </div>
    </>
  );
}

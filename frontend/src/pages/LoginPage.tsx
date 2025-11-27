import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { SiteHeader } from '../components/SiteHeader';

interface LoginFormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { token, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | undefined>();
  const [authError, setAuthError] = useState<string | undefined>();
  const [showPassword, setShowPassword] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'pending' | 'sent'>(
    'idle',
  );
  const [resendMessage, setResendMessage] = useState<string | undefined>();
  const { register, handleSubmit, watch } = useForm<LoginFormValues>({
    defaultValues: { email: '', password: '' },
  });
  const emailValue = (watch('email') ?? '').trim();

  const canResend = emailValue.trim().length > 0;
  const handleResend = async () => {
    if (!canResend) {
      setResendMessage('Enter your email to resend the verification link.');
      return;
    }
    setResendStatus('pending');
    setResendMessage(undefined);
    try {
      await api.post('/auth/resend-verification', { email: emailValue });
      setResendStatus('sent');
      setResendMessage('Check your inbox for a fresh verification link.');
    } catch (err) {
      setResendStatus('idle');
      setResendMessage(
        err?.response?.data?.message ??
          'Unable to resend verification email right now.',
      );
    }
  };

  const mutation = useMutation({
    mutationFn: (values: LoginFormValues) =>
      api.post('/auth/login', values).then((res) => res.data),
    onSuccess: (data) => {
      login(data.user, data.token);
      setError(undefined);
      setAuthError(undefined);
      setResendStatus('idle');
      setResendMessage(undefined);
      navigate('/dashboard');
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message ?? 'Unable to log in. Try again.';
      setError(message);
      setAuthError(message);
      setResendStatus('idle');
      setResendMessage(undefined);
    },
  });

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <SiteHeader />
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Log in</h1>
        <p className="mt-2 text-sm text-slate-500">
          Welcome back. Access your AI compliance workspace.
        </p>
        <form
          className="mt-8 space-y-5"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              {...register('email', { required: true })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password', { required: true })}
                className="w-full rounded-md border border-slate-200 px-3 py-2 pr-12 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center justify-center rounded-full bg-white/10 p-1 text-slate-400 transition hover:text-white"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4">
                    <path
                      d="M12 5c-5 0-9.27 3-11 7 0.73 4 6 7 11 7s10.27-3 11-7c-0.73-4-6-7-11-7zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                    />
                    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4">
                    <path
                      d="M17.94 17.94A10.02 10.02 0 0 1 6.06 6.06m0 0A9.93 9.93 0 0 1 12 5c5 0 9.27 3 11 7-.42 1.92-1.36 3.7-2.67 5.2m-1.4 1.4A10.02 10.02 0 0 1 6.06 6.06M3 3l18 18"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                    />
                  </svg>
                )}
              </button>
            </div>
          </label>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {authError === 'Email not verified' && (
            <div className="space-y-2 text-sm text-slate-500">
              <p>We sent a verification link to your inbox. You need to confirm before signing in.</p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendStatus === 'pending' || !canResend}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-60"
              >
                {resendStatus === 'pending'
                  ? 'Resending...'
                  : 'Resend verification email'}
              </button>
              {resendMessage && (
                <p className="text-xs text-slate-500">{resendMessage}</p>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-md bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {mutation.isPending ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Need an account?{' '}
          <Link
            to="/signup"
            className="font-medium text-sky-600 hover:text-sky-500"
          >
            Sign up
          </Link>
        </p>
        <p className="mt-1 text-center text-sm text-slate-500">
          <Link to="/" className="font-medium text-sky-600 hover:text-sky-500">
            Back to home
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-500">
          Forgot your password?{' '}
          <Link
            to="/forgot-password"
            className="font-medium text-sky-600 hover:text-sky-500"
          >
            Reset it here
          </Link>
        </p>
      </div>
    </div>
    </>
  );
}

// Auth domain route.
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import api from '@/platform/api/client';
import { useAuth } from '@/app/providers/AuthContext';
import { useState } from 'react';
import { SiteHeader } from '@/domains/marketing/components/SiteHeader';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';

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
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.08),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] px-4">
        <Card className="w-full max-w-md rounded-[1.75rem] border-slate-200/90 bg-white/95 shadow-[0_35px_100px_-40px_rgba(15,23,42,0.35)]">
          <CardContent className="p-8">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
              Log in
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Welcome back. Access your AI compliance workspace.
            </p>
            <form
              className="mt-8 space-y-5"
              onSubmit={handleSubmit((values) => mutation.mutate(values))}
            >
              <label className="block text-sm font-medium text-slate-700">
                Email
                <Input
                  type="email"
                  {...register('email', { required: true })}
                  className="mt-1"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Password
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', { required: true })}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center justify-center rounded-full p-1 text-slate-400 transition hover:text-slate-900"
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
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
                  <p>
                    We sent a verification link to your inbox. You need to
                    confirm before signing in.
                  </p>
                  <Button
                    type="button"
                    onClick={handleResend}
                    disabled={resendStatus === 'pending' || !canResend}
                    variant="outline"
                    className="w-full"
                  >
                    {resendStatus === 'pending'
                      ? 'Resending...'
                      : 'Resend verification email'}
                  </Button>
                  {resendMessage && (
                    <p className="text-xs text-slate-500">{resendMessage}</p>
                  )}
                </div>
              )}
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full bg-slate-950 text-white hover:bg-black"
              >
                {mutation.isPending ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-500">
              Need an account?{' '}
              <Link
                to="/signup"
                className="font-medium text-slate-700 transition-colors hover:text-slate-950"
              >
                Sign up
              </Link>
            </p>
            <p className="mt-1 text-center text-sm text-slate-500">
              <Link
                to="/"
                className="font-medium text-slate-700 transition-colors hover:text-slate-950"
              >
                Back to home
              </Link>
            </p>
            <p className="mt-2 text-center text-sm text-slate-500">
              Forgot your password?{' '}
              <Link
                to="/forgot-password"
                className="font-medium text-slate-700 transition-colors hover:text-slate-950"
              >
                Reset it here
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

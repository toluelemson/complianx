// Auth domain route.
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import api from '@/platform/api/client';
import { useAuth } from '@/app/providers/AuthContext';
import { useEffect, useState } from 'react';
import { SiteHeader } from '@/domains/marketing/components/SiteHeader';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';

interface SignupFormValues {
  email: string;
  password: string;
  companyName?: string;
  companyId?: string;
  invitationToken?: string;
  accountType?: 'personal' | 'organization';
}

export default function SignupPage() {
  const { token } = useAuth();
  const signupsPaused = true;
  const [error, setError] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | undefined>();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, watch, setValue } = useForm<SignupFormValues>(
    {
      defaultValues: {
        email: '',
        password: '',
        companyName: '',
        companyId: '',
        invitationToken: '',
      },
    },
  );
  const [searchParams] = useSearchParams();
  const [inviteInfo, setInviteInfo] = useState<{
    email: string;
    company: { name: string };
  } | null>(null);
  useEffect(() => {
    const tokenParam = searchParams.get('invitation');
    if (tokenParam) {
      setValue('invitationToken', tokenParam);
      api
        .get(`/invitations/${tokenParam}`)
        .then((res) => res.data)
        .then((data) => {
          setInviteInfo({ email: data.email, company: data.company });
          if (data.email) {
            setValue('email', data.email);
          }
        })
        .catch(() => {
          setError('Invitation invalid or expired.');
        });
    }
  }, [searchParams, setValue]);
  const invitationToken = watch('invitationToken');
  const isCompanyFlow = Boolean(invitationToken);

  const mutation = useMutation({
    mutationFn: (values: SignupFormValues) =>
      api.post('/auth/signup', values).then((res) => res.data),
    onSuccess: () => {
      setSuccessMessage(
        'Check your inbox for a verification link before you can log in.',
      );
      setError(undefined);
    },
    onError: (err: any) => {
      setError(
        err?.response?.data?.message ?? 'Unable to create your account.',
      );
      setSuccessMessage(undefined);
    },
  });

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  if (signupsPaused) {
    return (
      <>
        <SiteHeader />
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.08),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] px-4">
          <Card className="w-full max-w-md rounded-[1.75rem] border-slate-200/90 bg-white/95 text-center shadow-[0_35px_100px_-40px_rgba(15,23,42,0.35)]">
            <CardContent className="p-8">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                Signups paused
              </p>
              <h1 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-slate-900">
                New accounts are closed for now
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                We&apos;re pausing new signups while we onboard current teams.
                Please log in or reach out for access.
              </p>
              <div className="mt-6 space-y-3">
                <Button
                  asChild
                  className="w-full bg-slate-950 text-white hover:bg-black"
                >
                  <Link to="/login">Go to login</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/contact">Contact us</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.08),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] px-4">
        <Card className="w-full max-w-md rounded-[1.75rem] border-slate-200/90 bg-white/95 shadow-[0_35px_100px_-40px_rgba(15,23,42,0.35)]">
          <CardContent className="p-8">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
              Create an account
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Start generating AI compliance documentation.
            </p>
            <form
              className="mt-8 space-y-5"
              onSubmit={handleSubmit((values: SignupFormValues) => {
                const payload: SignupFormValues = {
                  ...values,
                  accountType: isCompanyFlow ? 'organization' : 'personal',
                };
                // Company creation via signup is disabled; only invite-based org signup is allowed.
                mutation.mutate(payload);
              })}
            >
              <input type="hidden" {...register('invitationToken')} />
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
                    {...register('password', { required: true, minLength: 8 })}
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
                    <span className="sr-only">
                      {showPassword ? 'Hide password' : 'Show password'}
                    </span>
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
              {successMessage && (
                <p className="text-sm text-emerald-600">{successMessage}</p>
              )}
              {isCompanyFlow && inviteInfo && (
                <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  Joining <strong>{inviteInfo.company.name}</strong> as{' '}
                  <strong>{inviteInfo.email || watch('email')}</strong>
                </div>
              )}
              {!isCompanyFlow && (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Personal workspaces spin up instantly. To join a company
                  workspace, accept an invitation after signup.
                </div>
              )}
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full bg-slate-950 text-white hover:bg-black"
              >
                {mutation.isPending ? 'Creating account...' : 'Sign Up'}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-slate-700 transition-colors hover:text-slate-950"
              >
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

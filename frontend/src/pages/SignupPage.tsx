import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { SiteHeader } from '../components/SiteHeader';

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
  const [error, setError] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | undefined>();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, watch, setValue } =
    useForm<SignupFormValues>({
      defaultValues: {
        email: '',
        password: '',
        companyName: '',
        companyId: '',
        invitationToken: '',
      },
    });
  const [searchParams] = useSearchParams();
  const queryType = searchParams.get('type');
  const [signupType, setSignupType] = useState<'personal' | 'company'>(() =>
    queryType === 'company' ? 'company' : 'personal',
  );
  useEffect(() => {
    setSignupType(queryType === 'company' ? 'company' : 'personal');
  }, [queryType]);
  const [inviteInfo, setInviteInfo] =
    useState<{ email: string; company: { name: string } } | null>(null);
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
  const isCompanyFlow = signupType === 'company' || Boolean(invitationToken);

  const mutation = useMutation({
    mutationFn: (values: SignupFormValues) =>
      api.post('/auth/signup', values).then((res) => res.data),
    onSuccess: (data) => {
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

  return (
    <>
      <SiteHeader />
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Create an account
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Start generating AI compliance documentation.
        </p>
        <div className="mt-4 space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
            Workspace type
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSignupType('personal')}
              className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                signupType === 'personal'
                  ? 'border-sky-500 bg-sky-50 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              Personal
            </button>
            <button
              type="button"
              onClick={() => setSignupType('company')}
              className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                signupType === 'company'
                  ? 'border-sky-500 bg-sky-50 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              Company
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {isCompanyFlow
              ? 'Create or join a company workspace with teammates in mind.'
              : 'Launch a lightweight personal workspace you can expand later.'}
          </p>
        </div>
        <form
          className="mt-8 space-y-5"
          onSubmit={handleSubmit((values: SignupFormValues) => {
            const payload: SignupFormValues = {
              ...values,
              accountType: isCompanyFlow ? 'organization' : 'personal',
            };
            if (
              isCompanyFlow &&
              !payload.invitationToken &&
              !payload.companyName &&
              !payload.companyId
            ) {
              setError('Enter a company name or an existing company ID to join.');
              return;
            }
            mutation.mutate(payload);
          })}
        >
          <input type="hidden" {...register('invitationToken')} />
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
                {...register('password', { required: true, minLength: 8 })}
                className="w-full rounded-md border border-slate-200 px-3 py-2 pr-12 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center justify-center rounded-full bg-white/10 p-1 text-slate-400 transition hover:text-white"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
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
          {isCompanyFlow && (
            <>
              {inviteInfo ? (
                <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  Joining <strong>{inviteInfo.company.name}</strong> as{' '}
                  <strong>{inviteInfo.email || watch('email')}</strong>
                </div>
              ) : (
                <>
                  <label className="block text-sm font-medium text-slate-700">
                    Company Name (create new)
                    <input
                      type="text"
                      {...register('companyName')}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                      placeholder="Acme Compliance"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Existing Company ID (optional)
                    <input
                      type="text"
                      {...register('companyId')}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                      placeholder="company uuid"
                    />
                  </label>
                  <p className="text-xs text-slate-500">
                    Already have a workspace? Share the ID above to join it.
                  </p>
                </>
              )}
            </>
          )}
          {!isCompanyFlow && (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Personal workspaces spin up instantly and you can invite teammates
              or connect to a company workspace anytime from the dashboard.
            </div>
          )}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-md bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {mutation.isPending ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-sky-600 hover:text-sky-500"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
    </>
  );
}

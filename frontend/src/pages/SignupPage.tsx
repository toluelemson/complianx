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
}

export default function SignupPage() {
  const { token } = useAuth();
  const [error, setError] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | undefined>();
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
  const companyName = watch('companyName');
  const companyId = watch('companyId');
  const invitationToken = watch('invitationToken');

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
        <form
          className="mt-8 space-y-5"
          onSubmit={handleSubmit((values: SignupFormValues) => {
            if (!values.invitationToken && !values.companyName && !values.companyId) {
              setError('Enter a company name or an existing company ID to join.');
              return;
            }
            mutation.mutate(values);
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
            <input
              type="password"
              {...register('password', { required: true, minLength: 8 })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </label>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {successMessage && (
            <p className="text-sm text-emerald-600">{successMessage}</p>
          )}
          {!inviteInfo && (
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
            </>
          )}
          {inviteInfo && (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Joining <strong>{inviteInfo.company.name}</strong> as{' '}
              <strong>{inviteInfo.email || watch('email')}</strong>
            </div>
          )}
          {!companyName && !companyId && !invitationToken && (
            <p className="text-xs text-amber-600">
              Provide a company name to create one or an existing company ID to
              join.
            </p>
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

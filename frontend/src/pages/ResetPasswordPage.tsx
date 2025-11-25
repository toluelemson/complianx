import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useState } from 'react';
import { SiteHeader } from '../components/SiteHeader';

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [message, setMessage] = useState<string | undefined>();
  const { register, handleSubmit, watch, formState } = useForm<ResetPasswordForm>({
    defaultValues: { password: '', confirmPassword: '' },
  });
  const passwordValue = watch('password');
  const mutation = useMutation({
    mutationFn: (values: ResetPasswordForm) =>
      api.post('/auth/reset-password', {
        token,
        password: values.password,
      }),
    onSuccess: () => {
      setMessage('Your password has been reset. You can now sign in.');
    },
    onError: (err: any) => {
      setMessage(
        err?.response?.data?.message ?? 'Unable to reset your password right now.',
      );
    },
  });

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Reset password</h1>
          <p className="mt-4 text-sm text-slate-500">
            A reset token is missing from the link. Please request a new link.
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 inline-flex rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
          >
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SiteHeader />
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-500">
          Paste a new password. You'll be able to log in once the token is accepted.
        </p>
        <form
          className="mt-8 space-y-5"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <label className="block text-sm font-medium text-slate-700">
            New password
            <input
              type="password"
              {...register('password', { required: true, minLength: 8 })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Confirm password
            <input
              type="password"
              {...register('confirmPassword', {
                required: true,
                validate: (value) =>
                  value === passwordValue || 'Passwords do not match',
              })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </label>
          {formState.errors.confirmPassword && (
            <p className="text-sm text-rose-600">
              {formState.errors.confirmPassword.message}
            </p>
          )}
          {message && <p className="text-sm text-slate-500">{message}</p>}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-md bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {mutation.isPending ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Need a new link?{' '}
          <Link
            to="/forgot-password"
            className="font-medium text-sky-600 hover:text-sky-500"
          >
            Request another reset
          </Link>
        </p>
      </div>
    </div>
    </>
  );
}

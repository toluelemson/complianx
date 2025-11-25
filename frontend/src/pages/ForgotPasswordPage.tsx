import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useState } from 'react';
import { SiteHeader } from '../components/SiteHeader';

interface ForgotPasswordForm {
  email: string;
}

export default function ForgotPasswordPage() {
  const { register, handleSubmit } = useForm<ForgotPasswordForm>({
    defaultValues: { email: '' },
  });
  const [message, setMessage] = useState<string | undefined>();
  const mutation = useMutation({
    mutationFn: (values: ForgotPasswordForm) =>
      api.post('/auth/request-password-reset', values),
    onSuccess: () => {
      setMessage(
        'If an account exists for that email, you will receive password reset instructions shortly.',
      );
    },
    onError: (err: any) => {
      setMessage(
        err?.response?.data?.message ??
          'Unable to send reset instructions right now.',
      );
    },
  });

  return (
    <>
      <SiteHeader />
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Forgot your password?
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Enter the email you used to sign up and we’ll send you a reset link.
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
          {message && <p className="text-sm text-slate-500">{message}</p>}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-md bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {mutation.isPending ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Remembered your password?{' '}
          <Link
            to="/login"
            className="font-medium text-sky-600 hover:text-sky-500"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
    </>
  );
}

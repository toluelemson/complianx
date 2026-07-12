// Auth domain route.
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/platform/api/client';
import { useState } from 'react';
import { SiteHeader } from '@/domains/marketing/components/SiteHeader';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';

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
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.08),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] px-4">
        <Card className="w-full max-w-md rounded-[1.75rem] border-slate-200/90 bg-white/95 shadow-[0_35px_100px_-40px_rgba(15,23,42,0.35)]">
          <CardContent className="p-8">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
              Forgot your password?
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Enter the email you used to sign up and we’ll send you a reset
              link.
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
              {message && <p className="text-sm text-slate-500">{message}</p>}
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full bg-slate-950 text-white hover:bg-black"
              >
                {mutation.isPending ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-500">
              Remembered your password?{' '}
              <Link
                to="/login"
                className="font-medium text-slate-700 transition-colors hover:text-slate-950"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

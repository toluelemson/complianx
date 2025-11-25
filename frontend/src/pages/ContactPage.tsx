import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { SiteHeader } from '../components/SiteHeader';
import { useState } from 'react';

interface ContactFormValues {
  name: string;
  email: string;
  company?: string;
  message: string;
}

export default function ContactPage() {
  const { register, handleSubmit, reset } = useForm<ContactFormValues>({
    defaultValues: { name: '', email: '', company: '', message: '' },
  });
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const mutation = useMutation({
    mutationFn: (values: ContactFormValues) =>
      api.post('/contact', values).then((res) => res.data),
    onSuccess: () => {
      setStatusMessage('Thanks! We’ll get back to you shortly.');
      reset();
    },
    onError: (err: any) => {
      setStatusMessage(
        err?.response?.data?.message ??
          'Unable to send that message right now. Please try again later.',
      );
    },
  });

  return (
    <>
      <SiteHeader />
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-10 shadow-xl">
          <h1 className="text-2xl font-semibold text-slate-900">Contact Sales</h1>
          <p className="mt-2 text-sm text-slate-500">
            Tell us about your AI compliance challenge and we’ll book a demo.
          </p>
          <form
            className="mt-6 space-y-4"
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Name
                <input
                  type="text"
                  {...register('name', { required: true })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Email
                <input
                  type="email"
                  {...register('email', { required: true })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Company (optional)
              <input
                type="text"
                {...register('company')}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Message
              <textarea
                rows={4}
                {...register('message', { required: true })}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {mutation.isPending ? 'Sending...' : 'Contact sales'}
            </button>
            {statusMessage && (
              <p className="text-center text-sm text-slate-500">{statusMessage}</p>
            )}
          </form>
        </div>
      </div>
    </>
  );
}

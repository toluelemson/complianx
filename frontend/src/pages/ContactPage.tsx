import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import api from '../api/client';
import { SiteHeader } from '../components/SiteHeader';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.08),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] px-4 py-12">
        <Card className="w-full max-w-2xl rounded-[1.75rem] border-slate-200/90 bg-white/95 shadow-[0_35px_100px_-40px_rgba(15,23,42,0.35)]">
          <CardContent className="p-10">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">Contact Sales</h1>
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
                <Input
                  type="text"
                  {...register('name', { required: true })}
                  className="mt-1"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Email
                <Input
                  type="email"
                  {...register('email', { required: true })}
                  className="mt-1"
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Company (optional)
              <Input
                type="text"
                {...register('company')}
                className="mt-1"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Message
              <Textarea
                rows={4}
                {...register('message', { required: true })}
                className="mt-1 min-h-[150px]"
              />
            </label>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-slate-950 text-white hover:bg-black"
            >
              {mutation.isPending ? 'Sending...' : 'Contact sales'}
            </Button>
            {statusMessage && (
              <p className="text-center text-sm text-slate-500">{statusMessage}</p>
            )}
          </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

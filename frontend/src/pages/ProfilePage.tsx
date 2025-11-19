import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client';
import { AppShell } from '../components/AppShell';

interface ProfileResponse {
  id: string;
  email: string;
  role: 'USER' | 'REVIEWER' | 'ADMIN' | 'COMPANY_ADMIN';
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  timezone?: string | null;
}

interface ProfileForm {
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  timezone?: string | null;
}

const timezoneOptions = [
  'UTC',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Paris',
  'Asia/Singapore',
  'Asia/Tokyo',
];

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery<ProfileResponse>({
    queryKey: ['profile'],
    queryFn: () => api.get('/users/me').then((res) => res.data),
  });
  const form = useForm<ProfileForm>({
    defaultValues: {
      firstName: '',
      lastName: '',
      jobTitle: '',
      phone: '',
      timezone: 'UTC',
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      form.reset({
        firstName: profileQuery.data.firstName ?? '',
        lastName: profileQuery.data.lastName ?? '',
        jobTitle: profileQuery.data.jobTitle ?? '',
        phone: profileQuery.data.phone ?? '',
        timezone: profileQuery.data.timezone ?? 'UTC',
      });
    }
  }, [profileQuery.data, form]);

  const updateMutation = useMutation({
    mutationFn: (payload: ProfileForm) =>
      api.patch('/users/me', payload).then((res) => res.data),
    onSuccess: (data: ProfileResponse) => {
      toast.success('Profile updated');
      form.reset({
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        jobTitle: data.jobTitle ?? '',
        phone: data.phone ?? '',
        timezone: data.timezone ?? 'UTC',
      });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => toast.error('Unable to update profile'),
  });

  const isComplete = (() => {
    const data = profileQuery.data;
    if (!data) {
      return false;
    }
    return Boolean(
      data.firstName?.trim() &&
        data.lastName?.trim() &&
        data.jobTitle?.trim() &&
        data.phone?.trim() &&
        data.timezone?.trim(),
    );
  })();

  return (
    <AppShell title="Profile settings">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <form
          className="grid gap-6"
          onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
        >
          <section className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">Account overview</p>
            <p className="text-sm text-slate-500">
              Email: {profileQuery.data?.email ?? 'loading...'}
            </p>
            {profileQuery.data && (
              <p className="text-sm text-slate-500">
                Role: {profileQuery.data.role.replace('_', ' ')}
                <span
                  className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    profileQuery.data.role === 'REVIEWER'
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : profileQuery.data.role === 'ADMIN' ||
                          profileQuery.data.role === 'COMPANY_ADMIN'
                        ? 'border-slate-300 bg-slate-100 text-slate-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  {profileQuery.data.role === 'REVIEWER'
                    ? 'Reviewer'
                    : profileQuery.data.role === 'ADMIN'
                    ? 'Admin'
                    : profileQuery.data.role === 'COMPANY_ADMIN'
                    ? 'Company Admin'
                    : 'User'}
                </span>
              </p>
            )}
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                isComplete
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}
            >
              {isComplete ? 'Profile complete' : 'Add details to complete profile'}
            </span>
          </section>
          <section className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">Personal details</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">First name</span>
                <input
                  type="text"
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  {...form.register('firstName')}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Last name</span>
                <input
                  type="text"
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  {...form.register('lastName')}
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Job title</span>
              <input
                type="text"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                {...form.register('jobTitle')}
              />
            </label>
          </section>
          <section className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">Contact & preferences</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Phone</span>
                <input
                  type="text"
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  {...form.register('phone')}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Timezone</span>
                <select
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  {...form.register('timezone')}
                >
                  {timezoneOptions.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
            {updateMutation.isError && (
              <p className="text-sm text-rose-500">
                Something went wrong. Please try again.
              </p>
            )}
          </div>
        </form>
      </div>
    </AppShell>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import api from '../api/client';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function CompanyPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const companyQuery = useQuery({
    queryKey: ['company'],
    queryFn: () => api.get('/company').then((res) => res.data),
  });

  const renameMutation = useMutation({
    mutationFn: (name: string) =>
      api.patch('/company', { name }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      setNewName('');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      api.patch(`/company/members/${memberId}/remove`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
    onError: () => {
      toast.error('Unable to remove member');
    },
  });

  if (!companyQuery.data && companyQuery.isError) {
    return <Navigate to="/dashboard" replace />;
  }

  const company = companyQuery.data?.company;
  const members = companyQuery.data?.members ?? [];
  const isCompanyAdmin = user?.role === 'ADMIN' || user?.role === 'COMPANY_ADMIN';
  const invitationsQuery = useQuery({
    queryKey: ['invitations'],
    enabled: Boolean(isCompanyAdmin),
    queryFn: () => api.get('/invitations').then((res) => res.data),
  });
  const inviteMutation = useMutation({
    mutationFn: (payload: { email: string }) =>
      api.post('/invitations', payload).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      setInviteEmail('');
    },
  });
  const [inviteEmail, setInviteEmail] = useState('');

  return (
    <AppShell title="Company Settings">
      {companyQuery.isLoading ? (
        <p className="text-sm text-slate-500">Loading company info...</p>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Company ID</p>
            <p className="text-lg font-semibold text-slate-900">
              {company?.id}
            </p>
            <p className="mt-4 text-sm text-slate-500">Company Name</p>
            <p className="text-lg font-semibold text-slate-900">
              {company?.name}
            </p>
            {isCompanyAdmin && (
              <form
                className="mt-4 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!newName.trim()) return;
                  renameMutation.mutate(newName.trim());
                }}
              >
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="New company name"
                  className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
                <button
                  type="submit"
                  disabled={renameMutation.isPending}
                  className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
                >
                  Rename
                </button>
              </form>
            )}
          </div>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold text-slate-900">Members</p>
            <div className="mt-4">
              <div className="hidden lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-2 font-medium">Email</th>
                        <th className="px-4 py-2 font-medium">Role</th>
                        <th className="px-4 py-2 font-medium">Joined</th>
                        <th className="px-4 py-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member: any) => (
                        <tr key={member.id} className="border-b border-slate-100">
                          <td className="px-4 py-2">{member.email}</td>
                          <td className="px-4 py-2 uppercase text-slate-500">
                            {member.role}
                          </td>
                          <td className="px-4 py-2 text-slate-500">
                            {new Date(member.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {isCompanyAdmin && member.id !== user?.id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Remove ${member.email} from the company?`,
                                    )
                                  ) {
                                    removeMemberMutation.mutate(member.id);
                                  }
                                }}
                                disabled={removeMemberMutation.isPending}
                                className="rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                              >
                                Remove
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="space-y-4 lg:hidden">
                {members.map((member: any) => (
                  <div
                    key={member.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {member.email}
                        </p>
                        <p className="text-xs uppercase text-slate-500">
                          {member.role}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-end">
                      {isCompanyAdmin && member.id !== user?.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Remove ${member.email} from the company?`,
                              )
                            ) {
                              removeMemberMutation.mutate(member.id);
                            }
                          }}
                          disabled={removeMemberMutation.isPending}
                          className="rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {isCompanyAdmin && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold text-slate-900">
                Invitations
              </p>
              <form
                className="mt-4 flex gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!inviteEmail.trim()) return;
                  inviteMutation.mutate({ email: inviteEmail.trim() });
                }}
              >
                <input
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="new.member@example.com"
                  className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  Invite
                </button>
              </form>
              <div className="mt-4 space-y-2">
                {invitationsQuery.isLoading ? (
                  <p className="text-sm text-slate-500">Loading invitations...</p>
                ) : (
                  (invitationsQuery.data ?? []).map((invite: any) => (
                    <div
                      key={invite.id}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{invite.email}</p>
                          <p className="text-xs text-slate-500">
                            Expires{' '}
                            {new Date(invite.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/signup?invitation=${invite.token}`,
                            );
                            alert('Invite link copied');
                          }}
                          className="text-sky-600 hover:text-sky-500"
                        >
                          Copy Link
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

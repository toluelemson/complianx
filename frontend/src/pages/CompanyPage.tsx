import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';

export default function CompanyPage() {
  const { user, activeCompanyId, setActiveCompany } = useAuth();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [createName, setCreateName] = useState('');
  const [leftCompany, setLeftCompany] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const hasCompanyMembership = Boolean(user?.companies?.length);
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (!hasCompanyMembership && activeCompanyId) {
      setActiveCompany(undefined);
    }
  }, [hasCompanyMembership, activeCompanyId, setActiveCompany]);

  useEffect(() => {
    if (activeCompanyId !== createdCompanyId) {
      setCreatedCompanyId(null);
    }
  }, [activeCompanyId, createdCompanyId]);

  const hasWorkspaceContext =
    Boolean(activeCompanyId) &&
    (hasCompanyMembership || (createdCompanyId && createdCompanyId === activeCompanyId));

  const companyQuery = useQuery({
    queryKey: ['company', activeCompanyId],
    enabled: Boolean(hasWorkspaceContext),
    queryFn: () =>
      api.get('/company').then((res) => res.data),
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

  const leaveCompanyMutation = useMutation({
    mutationFn: () => api.post('/company/leave').then((res) => res.data),
    onSuccess: () => {
      toast.success('You have left the company');
      queryClient.invalidateQueries({ queryKey: ['company'] });
      setLeftCompany(true);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Unable to leave the company');
    },
  });

  const isCompanyAdmin = user?.role === 'ADMIN' || user?.role === 'COMPANY_ADMIN';
  const invitationsQuery = useQuery({
    queryKey: ['invitations'],
    enabled: Boolean(isCompanyAdmin && hasWorkspaceContext),
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

  const createCompanyMutation = useMutation({
    mutationFn: (name?: string) =>
      api.post('/company/create', { name: name?.trim() || undefined }).then((res) => res.data),
    onSuccess: (data) => {
      const companyId = data?.companyId;
      if (companyId) {
        setCreatedCompanyId(companyId);
        setActiveCompany(companyId);
        queryClient.invalidateQueries({ queryKey: ['company'] });
        toast.success('Workspace created');
      }
      setCreateName('');
      setLeftCompany(false);
    },
    onError: () => toast.error('Unable to create workspace'),
  });

  useEffect(() => {
    if (companyQuery.isSuccess && companyQuery.data?.company) {
      setLeftCompany(false);
    }
  }, [companyQuery.isSuccess, companyQuery.data]);

  const renderCreateWorkspace = (message: { title: string; body: string }) => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <p className="text-lg font-semibold text-slate-900">{message.title}</p>
      <p className="text-sm text-slate-500">{message.body}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={createName}
          onChange={(e) => setCreateName(e.target.value)}
          placeholder="Workspace name (optional)"
          className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
        />
        <button
          type="button"
          onClick={() => createCompanyMutation.mutate(createName)}
          disabled={createCompanyMutation.isPending}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
        >
          {createCompanyMutation.isPending ? 'Creating...' : 'Create workspace'}
        </button>
      </div>
      <Link
        to="/dashboard"
        className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Back to dashboard
      </Link>
    </div>
  );

  if (!activeCompanyId) {
    return (
      <AppShell title="Company Settings">
        {renderCreateWorkspace({
          title: 'No workspace selected',
          body: 'Create a workspace to start collaborating, or select one from the header.',
        })}
      </AppShell>
    );
  }
  if (leftCompany) {
    return (
      <AppShell title="Company Settings">
        {renderCreateWorkspace({
          title: 'You’re not part of a shared company workspace',
          body: 'Leaving removed your access. Create a new workspace or accept an invite.',
        })}
      </AppShell>
    );
  }
  if (companyQuery.isError) {
    return (
      <AppShell title="Company Settings">
        {renderCreateWorkspace({
          title: 'Unable to load a shared company workspace',
          body: 'Create a workspace or accept an invite to continue.',
        })}
      </AppShell>
    );
  }

  const company = companyQuery.data?.company;
  const members = companyQuery.data?.members ?? [];
  const adminCount = members.filter((member: any) => member.role === 'ADMIN').length;
  const isSoleAdmin = user?.role === 'ADMIN' && adminCount <= 1;

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
            {company && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">
                  Need to exit this company?
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Leaving will remove your access to the shared workspace. You can join a different company or create a fresh personal workspace afterward.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !window.confirm(
                          'Are you sure you want to leave this company? You will lose access to its workspace.'
                        )
                      ) {
                        return;
                      }
                      leaveCompanyMutation.mutate();
                    }}
                    disabled={leaveCompanyMutation.isPending || isSoleAdmin}
                    className="inline-flex items-center rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                  >
                    {leaveCompanyMutation.isPending
                      ? 'Leaving…'
                      : 'Leave company'}
                  </button>
                  {isSoleAdmin && (
                    <p className="text-xs text-rose-500">
                      Assign another admin before leaving.
                    </p>
                  )}
                </div>
              </div>
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

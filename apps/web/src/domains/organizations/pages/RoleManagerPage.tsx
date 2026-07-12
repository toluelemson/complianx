// Organizations domain route.
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import api from '@/platform/api/client';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Select } from '@/shared/components/ui/select';

const ROLE_OPTIONS: Array<'USER' | 'REVIEWER' | 'ADMIN'> = [
  'USER',
  'REVIEWER',
  'ADMIN',
];

export default function RoleManagerPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const usersQuery = useQuery({
    queryKey: ['users'],
    enabled: user?.role === 'ADMIN',
    queryFn: () => api.get('/users').then((res) => res.data),
  });

  const mutation = useMutation({
    mutationFn: (payload: { id: string; role: string }) =>
      api
        .patch(`/users/${payload.id}/role`, { role: payload.role })
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const sortedUsers = useMemo(() => {
    if (!usersQuery.data) return [];
    return [...usersQuery.data].sort((a, b) => a.email.localeCompare(b.email));
  }, [usersQuery.data]);

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppShell title="Role Management">
      <p className="text-sm text-slate-600">
        Grant reviewer or admin roles to members who handle approvals.
      </p>
      <Card className="mt-6 rounded-2xl border-slate-200/90 bg-white/90 shadow-[0_20px_45px_-32px_rgba(15,23,42,0.3)]">
        <CardContent className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((member: any) => (
                <tr key={member.id} className="border-b border-slate-100">
                  <td className="px-6 py-4 text-slate-900">{member.email}</td>
                  <td className="px-6 py-4">
                    <Select
                      value={member.role}
                      onChange={(event) =>
                        mutation.mutate({
                          id: member.id,
                          role: event.target.value,
                        })
                      }
                      className="h-9 w-auto rounded-xl px-3 py-1.5 text-sm shadow-none"
                      disabled={mutation.isPending}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AppShell>
  );
}

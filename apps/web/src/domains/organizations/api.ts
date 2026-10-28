import api from '@/platform/api/client';

export function getCompany() {
  return api.get('/company').then((response) => response.data);
}

export function renameCompany(name: string) {
  return api.patch('/company', { name }).then((response) => response.data);
}

export function updateCompanyProfile(payload: Record<string, unknown>) {
  return api.patch('/company/profile', payload).then((response) => response.data);
}

export function removeCompanyMember(memberId: string) {
  return api
    .patch(`/company/members/${memberId}/remove`)
    .then((response) => response.data);
}

export function leaveCompany() {
  return api.post('/company/leave').then((response) => response.data);
}

export function listInvitations() {
  return api.get('/invitations').then((response) => response.data);
}

export function createInvitation(payload: { email: string }) {
  return api.post('/invitations', payload).then((response) => response.data);
}

export function createCompany(name?: string) {
  return api
    .post('/company/create', { name: name?.trim() || undefined })
    .then((response) => response.data);
}

export function listUsers() {
  return api.get('/users').then((response) => response.data);
}

export function updateUserRole(id: string, role: string) {
  return api.patch(`/users/${id}/role`, { role }).then((response) => response.data);
}

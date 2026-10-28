import api from '@/platform/api/client';

export function getBillingPlan() {
  return api.get('/billing/plan').then((response) => response.data);
}

export function getBillingUsage() {
  return api.get('/billing/usage').then((response) => response.data);
}

export function createCheckout(payload: { plan: 'PRO' | 'ENTERPRISE' }) {
  return api.post('/billing/checkout', payload).then((response) => response.data);
}

export function createBillingPortal() {
  return api.post('/billing/portal').then((response) => response.data);
}

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import BillingModal from './BillingModal';

interface Notification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read?: boolean;
}

interface AppShellProps {
  title?: string;
  children: ReactNode;
}

export function AppShell({ title, children }: AppShellProps) {
  const { logout, user } = useAuth();
  const qc = useQueryClient();
  const countQuery = useQuery<{ count: number }>({
    queryKey: ['notifications', 'count'],
    enabled: Boolean(user?.id),
    queryFn: () => api.get('/notifications/count').then((r) => r.data),
    refetchInterval: 15000,
  });
  const [open, setOpen] = useState(false);
  const listQuery = useQuery<Notification[]>({
    queryKey: ['notifications', 'list'],
    enabled: Boolean(user?.id),
    queryFn: () => api.get('/notifications?unreadOnly=true&limit=5').then((r) => r.data),
    refetchInterval: open ? 15000 : false,
  });
  const markAllMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'count'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'list'] });
    },
  });
  const [markingId, setMarkingId] = useState<string | null>(null);
  const markSingleMutation = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'count'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'list'] });
    },
    onSettled: () => {
      setMarkingId(null);
    },
  });
  const unread = countQuery.data?.count ?? 0;
  const [billingOpen, setBillingOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    const handler = (event: Event) => {
      if (event.type === 'paywall') {
        setBillingOpen(true);
      }
    };
    window.addEventListener('paywall', handler);
    return () => window.removeEventListener('paywall', handler);
  }, []);
  const navSections = useMemo(() => {
    const workspace = [
      { label: 'Dashboard', to: '/dashboard', show: true },
      { label: 'Profile', to: '/settings/profile', show: true },
    ].filter((link) => link.show);
    const organization = [
      { label: 'Company', to: '/company', show: Boolean(user?.companyId) },
      { label: 'Roles', to: '/admin/roles', show: user?.role === 'ADMIN' },
    ].filter((link) => link.show);
    const sections = workspace.length ? [{ title: 'Workspace', links: workspace }] : [];
    if (organization.length) {
      sections.push({ title: 'Organization', links: organization });
    }
    return sections;
  }, [user?.companyId, user?.role]);
  const closeMobileMenu = () => setMobileMenuOpen(false);
  const renderDesktopNav = () =>
    navSections.map((section, idx) => (
      <div key={section.title} className="flex items-center gap-4">
        {idx > 0 && <span className="hidden h-5 w-px bg-slate-200 lg:block" aria-hidden="true" />}
        {section.links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={closeMobileMenu}
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            {link.label}
          </Link>
        ))}
      </div>
    ));
  const renderMobileNav = () =>
    navSections.map((section) => (
      <div key={section.title} className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {section.title}
        </p>
        <div className="flex flex-col gap-1">
          {section.links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={closeMobileMenu}
              className="rounded-md px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    ));
  const renderNotificationsTrigger = () => (
    <div className="relative">
      <button
        onClick={async () => {
          const next = !open;
          setOpen(next);
          await listQuery.refetch();
          await countQuery.refetch();
        }}
        className="relative rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        title="Notifications"
        type="button"
      >
        Notifications
        {unread > 0 && (
          <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-3 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
          </div>
          <div className="mt-2 space-y-2">
            {listQuery.data?.length ? (
              listQuery.data.map((n) => (
                <div key={n.id} className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  <p className="text-xs text-slate-600">{n.body}</p>
                  <p className="text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                  <div className="mt-2 flex justify-end">
                    {n.read ? (
                      <span className="text-[11px] font-semibold text-slate-400">Read</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setMarkingId(n.id);
                          markSingleMutation.mutate(n.id);
                        }}
                        disabled={markSingleMutation.isPending && markingId === n.id}
                        className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {markSingleMutation.isPending && markingId === n.id ? 'Marking...' : 'Mark read'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No new notifications.</p>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
            <button
              onClick={() => markAllMutation.mutate()}
              className="text-xs font-semibold text-sky-600 hover:text-sky-500 disabled:opacity-60"
            >
              Mark all read
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              aria-label="Close notifications"
              title="Close"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <Link to="/" className="text-lg font-semibold text-slate-900">
              NeuralDocx
            </Link>
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setBillingOpen(true)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                type="button"
              >
                Billing
              </button>
              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="inline-flex items-center rounded-md border border-slate-200 p-2 text-slate-700 hover:bg-slate-100"
                aria-label="Toggle navigation menu"
                type="button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  {mobileMenuOpen ? (
                    <path
                      fillRule="evenodd"
                      d="M6.225 4.811a1 1 0 0 1 1.414 0L12 9.172l4.361-4.361a1 1 0 1 1 1.414 1.414L13.414 10.5l4.361 4.361a1 1 0 0 1-1.414 1.414L12 11.914l-4.361 4.361a1 1 0 0 1-1.414-1.414L10.586 10.5 6.225 6.139a1 1 0 0 1 0-1.328Z"
                      clipRule="evenodd"
                    />
                  ) : (
                    <path d="M4 6.75A.75.75 0 0 1 4.75 6h14.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 6.75zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H4.75a.75.75 0 0 1-.75-.75zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H4.75a.75.75 0 0 1-.75-.75z" />
                  )}
                </svg>
              </button>
            </div>
            <div className="hidden flex-1 items-center justify-end gap-4 lg:flex">
              <button
                onClick={() => setBillingOpen(true)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                type="button"
              >
                Billing
              </button>
              {renderNotificationsTrigger()}
              <Link
                to="/"
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Home
              </Link>
              {renderDesktopNav()}
              <button
                onClick={() => {
                  logout();
                  closeMobileMenu();
                }}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                type="button"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white lg:hidden">
            <div className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6">
              <div className="space-y-4">{renderMobileNav()}</div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setBillingOpen(true)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  type="button"
                >
                  Billing
                </button>
                <Link
                  to="/"
                  onClick={closeMobileMenu}
                  className="rounded-md border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Home
                </Link>
                {renderNotificationsTrigger()}
                <button
                  onClick={() => {
                    logout();
                    closeMobileMenu();
                  }}
                  className="rounded-md border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  type="button"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <BillingModal isOpen={billingOpen} onClose={() => setBillingOpen(false)} />
        {title && (
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

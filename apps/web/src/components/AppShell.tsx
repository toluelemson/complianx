import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/platform/api/client';
import BillingModal from './BillingModal';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Select } from '@/shared/components/ui/select';

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
  const { logout, user, activeCompanyId, setActiveCompany } = useAuth();
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
    queryFn: () =>
      api.get('/notifications?unreadOnly=true&limit=5').then((r) => r.data),
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
    mutationFn: (id: string) =>
      api.post(`/notifications/${id}/read`).then((r) => r.data),
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
    const primary = [
      { label: 'Dashboard', to: '/dashboard', show: true },
      { label: 'Demo Tool', to: '/demo/eu-ai-act-report', show: true },
      { label: 'Company', to: '/company', show: Boolean(user) },
      { label: 'Profile', to: '/settings/profile', show: true },
    ].filter((link) => link.show);
    const admin = [
      { label: 'Roles', to: '/admin/roles', show: user?.role === 'ADMIN' },
    ].filter((link) => link.show);
    const sections = primary.length
      ? [{ title: 'Navigation', links: primary }]
      : [];
    if (admin.length) {
      sections.push({ title: 'Admin', links: admin });
    }
    return sections;
  }, [user]);
  const closeMobileMenu = () => setMobileMenuOpen(false);
  const renderDesktopNav = () =>
    navSections.map((section, idx) => (
      <div key={section.title} className="flex items-center gap-4">
        {idx > 0 && (
          <span
            className="hidden h-5 w-px bg-slate-200 lg:block"
            aria-hidden="true"
          />
        )}
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
      <Button
        onClick={async () => {
          const next = !open;
          setOpen(next);
          await listQuery.refetch();
          await countQuery.refetch();
        }}
        variant="outline"
        size="sm"
        className="relative"
        title="Notifications"
        type="button"
      >
        Notifications
        {unread > 0 && (
          <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>
      {open && (
        <Card className="absolute right-0 top-full z-20 mt-3 w-80 max-w-[calc(100vw-2rem)]">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">
                Notifications
              </p>
              <Badge variant="outline">{unread} unread</Badge>
            </div>
            <div className="mt-2 space-y-2">
              {listQuery.data?.length ? (
                listQuery.data.map((n) => (
                  <Card key={n.id} className="rounded-xl shadow-none">
                    <CardContent className="px-3 py-2">
                      <p className="text-sm font-medium text-slate-900">
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-600">{n.body}</p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                      <div className="mt-2 flex justify-end">
                        {n.read ? (
                          <span className="text-[11px] font-semibold text-slate-400">
                            Read
                          </span>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => {
                              setMarkingId(n.id);
                              markSingleMutation.mutate(n.id);
                            }}
                            disabled={
                              markSingleMutation.isPending && markingId === n.id
                            }
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                          >
                            {markSingleMutation.isPending && markingId === n.id
                              ? 'Marking...'
                              : 'Mark read'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-slate-500">No new notifications.</p>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
              <Button
                onClick={() => markAllMutation.mutate()}
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs font-semibold text-sky-600 hover:text-sky-500"
              >
                Mark all read
              </Button>
              <Button
                onClick={() => setOpen(false)}
                variant="outline"
                size="sm"
                aria-label="Close notifications"
                title="Close"
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.08),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between gap-3 py-4">
            <Link
              to="/"
              className="flex items-center gap-3 text-lg font-semibold tracking-[-0.02em] text-slate-900"
            >
              <img
                src="/compliance-icon.svg"
                alt="NeuralDocx"
                className="h-8 w-8 rounded-2xl border border-slate-900/10 bg-white p-1 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.45)]"
              />
              <span className="whitespace-nowrap">NeuralDocx</span>
            </Link>
            <div className="flex items-center gap-3 lg:hidden">
              <Button
                onClick={() => setBillingOpen(true)}
                variant="outline"
                size="sm"
                type="button"
              >
                Billing
              </Button>
              <Button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                variant="outline"
                size="sm"
                className="h-10 w-10 rounded-xl p-0"
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
              </Button>
            </div>
          </div>
          <div className="hidden items-center justify-between gap-6 border-t border-slate-200/70 py-3 lg:flex">
            <nav className="min-w-0 overflow-x-auto">
              <div className="flex min-w-max items-center gap-6">
                {renderDesktopNav()}
              </div>
            </nav>
            <div className="flex shrink-0 items-center gap-3">
              <Button asChild variant="outline" size="sm">
                <Link to="/">Home</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a
                  href="https://calendly.com/neuraldocx"
                  target="_blank"
                  rel="noreferrer"
                >
                  Book demo
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/contact">Contact</Link>
              </Button>
              {user?.companies && user.companies.length > 1 && (
                <Select
                  value={activeCompanyId ?? user.companies[0]?.companyId ?? ''}
                  onChange={(event) => setActiveCompany(event.target.value)}
                  className="h-9 w-auto rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-none"
                >
                  {user.companies.map((company) => (
                    <option key={company.companyId} value={company.companyId}>
                      {company.companyName ?? company.companyId}
                    </option>
                  ))}
                </Select>
              )}
              <Button
                onClick={() => setBillingOpen(true)}
                variant="outline"
                size="sm"
                type="button"
              >
                Billing
              </Button>
              {renderNotificationsTrigger()}
              <Button
                onClick={() => {
                  logout();
                  closeMobileMenu();
                }}
                variant="outline"
                size="sm"
                type="button"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-slate-200/80 bg-white/95 backdrop-blur-xl lg:hidden">
            <Card className="mx-auto max-w-7xl space-y-4 rounded-none border-0 shadow-none">
              <CardContent className="space-y-4 px-4 py-4 sm:px-6">
                <div className="space-y-4">{renderMobileNav()}</div>
                <div className="flex flex-col gap-2">
                  <Button
                    asChild
                    variant="outline"
                    className="justify-start rounded-xl"
                  >
                    <Link to="/" onClick={closeMobileMenu}>
                      Home
                    </Link>
                  </Button>
                  {user?.companies && user.companies.length > 1 && (
                    <Select
                      value={
                        activeCompanyId ?? user.companies[0]?.companyId ?? ''
                      }
                      onChange={(event) => {
                        setActiveCompany(event.target.value);
                        closeMobileMenu();
                      }}
                      className="rounded-xl text-sm font-semibold text-slate-700"
                    >
                      {user.companies.map((company) => (
                        <option
                          key={company.companyId}
                          value={company.companyId}
                        >
                          {company.companyName ?? company.companyId}
                        </option>
                      ))}
                    </Select>
                  )}
                  <Button
                    asChild
                    variant="outline"
                    className="justify-start rounded-xl"
                  >
                    <a
                      href="https://calendly.com/neuraldocx"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Book demo
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="justify-start rounded-xl"
                  >
                    <Link to="/contact" onClick={closeMobileMenu}>
                      Contact
                    </Link>
                  </Button>
                  <Button
                    onClick={() => setBillingOpen(true)}
                    variant="outline"
                    className="justify-start rounded-xl"
                    type="button"
                  >
                    Billing
                  </Button>
                  {renderNotificationsTrigger()}
                  <Button
                    onClick={() => {
                      logout();
                      closeMobileMenu();
                    }}
                    variant="outline"
                    className="justify-start rounded-xl"
                    type="button"
                  >
                    Logout
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <BillingModal
          isOpen={billingOpen}
          onClose={() => setBillingOpen(false)}
        />
        {title && (
          <div className="mb-6 rounded-[1.75rem] border border-slate-200/90 bg-white/92 px-6 py-5 shadow-[0_22px_50px_-34px_rgba(15,23,42,0.25)] backdrop-blur">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">
              {title}
            </h1>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

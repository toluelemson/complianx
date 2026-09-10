import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { BrandLink } from '@/shared/components/brand/BrandLink';
import {
  MarketingEnterpriseDemoLink,
  MarketingSubmitSystemLink,
} from './MarketingTrackedLinks';
import { MARKETING_SITE_NAV_LINKS } from '../lib/navigation';

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <BrandLink
          brandClassName="text-lg font-semibold tracking-[-0.02em] text-[#383838]"
          iconClassName="flex h-8 w-8 items-center justify-center rounded-lg border border-[#383838]/10 bg-white"
          imageClassName="h-8 w-8 rounded-2xl p-1"
        />

        <nav className="hidden items-center gap-6 lg:flex">
          {MARKETING_SITE_NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/eu-ai-act-checker"
            className="text-sm font-medium text-slate-900 transition-colors hover:text-black"
          >
            View example package
          </Link>
          <MarketingEnterpriseDemoLink
            source="site_header"
            className="text-sm font-medium text-slate-900 transition-colors hover:text-black"
          >
            Example workflow
          </MarketingEnterpriseDemoLink>
        </nav>

        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link to="/login">Log in</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="hidden sm:inline-flex bg-[#d40c2e] text-white hover:bg-[#e21236]"
          >
            <MarketingSubmitSystemLink source="site_header">
              Assess an AI system
            </MarketingSubmitSystemLink>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="h-9 w-9 rounded-full p-0 lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {mobileMenuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
          </Button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="border-t border-slate-200 bg-white/96 px-4 py-4 sm:px-6 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            {MARKETING_SITE_NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/eu-ai-act-checker"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              View example package
            </Link>
            <MarketingEnterpriseDemoLink
              source="site_header"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              onClick={() => setMobileMenuOpen(false)}
            >
              Example workflow
            </MarketingEnterpriseDemoLink>
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              Log in
            </Link>
            <MarketingSubmitSystemLink
              source="site_header"
              className="rounded-lg bg-[#d40c2e] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#e21236]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Assess an AI system
            </MarketingSubmitSystemLink>
          </div>
        </div>
      ) : null}
    </header>
  );
}

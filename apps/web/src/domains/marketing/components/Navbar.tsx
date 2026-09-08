import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { BrandLink } from '@/shared/components/brand/BrandLink';
import {
  MarketingEnterpriseDemoLink,
  MarketingSubmitSystemLink,
} from './MarketingTrackedLinks';
import { MARKETING_NAV_LINKS } from '../lib/navigation';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const headerClassName = 'animate-enter-fade sticky top-0 z-30 border-b border-[#e8e8e8] bg-white';

  const logoShellClassName = 'flex h-8 w-8 items-center justify-center rounded-lg border border-[#383838]/10 bg-white';

  const brandTextClassName = 'text-base font-semibold tracking-tight text-[#383838]';

  const navLinkClassName = 'text-sm font-medium text-[#383838] transition hover:text-[#d40c2e]';

  const utilityLinkClassName = navLinkClassName;

  const loginButtonClassName = 'hidden text-[#383838] hover:text-[#d40c2e] sm:inline-flex';

  const mobileToggleClassName = 'h-8 w-8 rounded-md border border-[#dbdbdb] bg-white p-0 text-[#383838] hover:bg-[#fafafa] hover:text-[#d40c2e] lg:hidden';

  const mobilePanelClassName = 'border-t border-[#e8e8e8] bg-white px-5 py-4 sm:px-8 lg:hidden';

  const mobileLinkClassName = 'rounded-md border border-[#e8e8e8] bg-[#fafafa] px-4 py-3 text-sm font-medium text-[#383838] transition hover:border-[#d40c2e] hover:text-[#d40c2e]';

  const mobileGhostClassName = 'justify-start rounded-md text-slate-700 hover:text-slate-950';

  return (
    <header data-landing-navbar="true" className={headerClassName}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
        <BrandLink
          brandClassName={brandTextClassName}
          iconClassName={logoShellClassName}
        />

        <nav className="hidden items-center gap-6 lg:flex">
          {MARKETING_NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} className={navLinkClassName}>
              {link.label}
            </a>
          ))}
          <Link to="/eu-ai-act-checker" className={utilityLinkClassName}>
            Compliance check
          </Link>
          <MarketingEnterpriseDemoLink
            source="navbar"
            className={utilityLinkClassName}
          >
            Live demo
          </MarketingEnterpriseDemoLink>
        </nav>

        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={loginButtonClassName}
          >
            <Link to="/login">Log in</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className={mobileToggleClassName}
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
          <Button
            asChild
            size="sm"
            className="bg-[#d40c2e] text-white hover:bg-[#e21236]"
          >
            <MarketingSubmitSystemLink source="navbar">
              Submit your system
            </MarketingSubmitSystemLink>
          </Button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className={mobilePanelClassName}>
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            {MARKETING_NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={closeMobileMenu}
                className={mobileLinkClassName}
              >
                {link.label}
              </a>
            ))}
            <Button asChild variant="ghost" className={mobileGhostClassName}>
              <Link to="/eu-ai-act-checker" onClick={closeMobileMenu}>
                Compliance check
              </Link>
            </Button>
            <Button asChild variant="ghost" className={mobileGhostClassName}>
              <MarketingEnterpriseDemoLink
                source="navbar"
                onClick={closeMobileMenu}
              >
                Live demo
              </MarketingEnterpriseDemoLink>
            </Button>
            <Button asChild variant="ghost" className={mobileGhostClassName}>
              <Link to="/login" onClick={closeMobileMenu}>
                Log in
              </Link>
            </Button>
            <Button
              asChild
              className="justify-start rounded-md bg-[#d40c2e] text-white hover:bg-[#e21236]"
            >
              <MarketingSubmitSystemLink
                source="navbar"
                onClick={closeMobileMenu}
              >
                Submit your system
              </MarketingSubmitSystemLink>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

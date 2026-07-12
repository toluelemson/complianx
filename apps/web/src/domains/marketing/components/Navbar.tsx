import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { BrandLink } from '@/shared/components/brand/BrandLink';
import {
  MarketingEnterpriseDemoLink,
  MarketingSubmitSystemLink,
} from './MarketingTrackedLinks';
import { CALENDLY_URL, MARKETING_NAV_LINKS } from '../lib/navigation';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLightSection, setIsLightSection] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    const updateTheme = () => {
      const header = document.querySelector(
        'header[data-landing-navbar="true"]',
      );
      const lightSections = document.querySelectorAll<HTMLElement>(
        '[data-nav-theme="light"]',
      );

      if (!header || lightSections.length === 0) {
        setIsLightSection(false);
        return;
      }

      const headerRect = header.getBoundingClientRect();
      const probeY = headerRect.bottom - 8;

      const shouldUseLightTheme = Array.from(lightSections).some((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= probeY && rect.bottom >= probeY;
      });

      setIsLightSection(shouldUseLightTheme);
    };

    updateTheme();
    window.addEventListener('scroll', updateTheme, { passive: true });
    window.addEventListener('resize', updateTheme);

    return () => {
      window.removeEventListener('scroll', updateTheme);
      window.removeEventListener('resize', updateTheme);
    };
  }, []);

  const headerClassName = isLightSection
    ? 'animate-enter-fade sticky top-0 z-30 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl'
    : 'animate-enter-fade sticky top-0 z-30 border-b border-white/10 bg-[#0a0c10]/82 backdrop-blur-xl';

  const logoShellClassName = isLightSection
    ? 'flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white'
    : 'flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]';

  const brandTextClassName = isLightSection
    ? 'text-base font-semibold tracking-tight text-slate-950'
    : 'text-base font-semibold tracking-tight text-white';

  const navLinkClassName = isLightSection
    ? 'text-sm font-medium text-slate-600 transition hover:text-slate-950'
    : 'text-sm font-medium text-slate-300 transition hover:text-white';

  const utilityLinkClassName = isLightSection
    ? 'text-sm font-medium text-slate-900 transition hover:text-black'
    : 'text-sm font-medium text-slate-200 transition hover:text-white';

  const loginButtonClassName = isLightSection
    ? 'hidden text-slate-700 hover:text-slate-950 sm:inline-flex'
    : 'hidden text-slate-200 hover:text-white sm:inline-flex';

  const enterpriseButtonClassName = isLightSection
    ? 'hidden border-slate-200 bg-white text-slate-900 hover:bg-slate-50 hover:text-black sm:inline-flex'
    : 'hidden border-white/15 bg-white/[0.03] text-slate-100 hover:bg-white/[0.08] hover:text-white sm:inline-flex';

  const mobileToggleClassName = isLightSection
    ? 'h-9 w-9 rounded-full border border-slate-200 bg-white p-0 text-slate-700 hover:bg-slate-50 hover:text-slate-950 lg:hidden'
    : 'h-9 w-9 rounded-full border border-white/10 bg-white/[0.03] p-0 text-slate-100 hover:bg-white/[0.08] hover:text-white lg:hidden';

  const mobilePanelClassName = isLightSection
    ? 'border-t border-slate-200 bg-white/96 px-5 py-4 sm:px-8 lg:hidden'
    : 'border-t border-white/10 bg-[#0a0c10]/96 px-5 py-4 sm:px-8 lg:hidden';

  const mobileLinkClassName = isLightSection
    ? 'rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950'
    : 'rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06] hover:text-white';

  const mobileGhostClassName = isLightSection
    ? 'justify-start rounded-2xl text-slate-700 hover:text-slate-950'
    : 'justify-start rounded-2xl text-slate-200 hover:text-white';

  const mobileEnterpriseClassName = isLightSection
    ? 'justify-start rounded-2xl border-slate-200 bg-white text-slate-900 hover:bg-slate-50 hover:text-black'
    : 'justify-start rounded-2xl border-white/15 bg-white/[0.03] text-slate-100 hover:bg-white/[0.08] hover:text-white';

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
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noreferrer"
            className={utilityLinkClassName}
          >
            Live demo
          </a>
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
            asChild
            variant="outline"
            size="sm"
            className={enterpriseButtonClassName}
          >
            <MarketingEnterpriseDemoLink source="navbar">
              Enterprise demo
            </MarketingEnterpriseDemoLink>
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
            className="bg-white text-black hover:bg-[#F3F6FF]"
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
              variant="outline"
              className={mobileEnterpriseClassName}
            >
              <MarketingEnterpriseDemoLink
                source="navbar"
                onClick={closeMobileMenu}
              >
                Enterprise demo
              </MarketingEnterpriseDemoLink>
            </Button>
            <Button
              asChild
              className="justify-start rounded-2xl bg-white text-black hover:bg-[#F3F6FF]"
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

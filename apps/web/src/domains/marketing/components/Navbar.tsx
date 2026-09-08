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

  const headerClassName = 'animate-enter-fade sticky top-0 z-30 border-b border-[#e8e8e8] bg-white';

  const logoShellClassName = isLightSection
    ? 'flex h-8 w-8 items-center justify-center rounded-md border border-[#dbdbdb] bg-white'
    : 'flex h-8 w-8 items-center justify-center rounded-md border border-[#dbdbdb] bg-white';

  const brandTextClassName = isLightSection
    ? 'text-base font-semibold tracking-tight text-[#383838]'
    : 'text-base font-semibold tracking-tight text-[#383838]';

  const navLinkClassName = isLightSection
    ? 'text-sm font-medium text-[#383838] transition hover:text-[#d40c2e]'
    : 'text-sm font-medium text-[#383838] transition hover:text-[#d40c2e]';

  const utilityLinkClassName = isLightSection
    ? 'text-sm font-medium text-[#d40c2e] transition hover:text-[#e21236]'
    : 'text-sm font-medium text-[#d40c2e] transition hover:text-[#e21236]';

  const loginButtonClassName = isLightSection
    ? 'hidden text-[#383838] hover:text-[#d40c2e] sm:inline-flex'
    : 'hidden text-[#383838] hover:text-[#d40c2e] sm:inline-flex';

  const enterpriseButtonClassName = isLightSection
    ? 'hidden border-[#dbdbdb] bg-white text-[#383838] hover:bg-[#fafafa] hover:text-[#d40c2e] sm:inline-flex'
    : 'hidden border-[#dbdbdb] bg-white text-[#383838] hover:bg-[#fafafa] hover:text-[#d40c2e] sm:inline-flex';

  const mobileToggleClassName = isLightSection
    ? 'h-8 w-8 rounded-md border border-[#dbdbdb] bg-white p-0 text-[#383838] hover:bg-[#fafafa] hover:text-[#d40c2e] lg:hidden'
    : 'h-8 w-8 rounded-md border border-[#dbdbdb] bg-white p-0 text-[#383838] hover:bg-[#fafafa] hover:text-[#d40c2e] lg:hidden';

  const mobilePanelClassName = isLightSection
    ? 'border-t border-[#e8e8e8] bg-white px-5 py-4 sm:px-8 lg:hidden'
    : 'border-t border-[#e8e8e8] bg-white px-5 py-4 sm:px-8 lg:hidden';

  const mobileLinkClassName = isLightSection
    ? 'rounded-md border border-[#e8e8e8] bg-[#fafafa] px-4 py-3 text-sm font-medium text-[#383838] transition hover:border-[#d40c2e] hover:text-[#d40c2e]'
    : 'rounded-md border border-[#e8e8e8] bg-[#fafafa] px-4 py-3 text-sm font-medium text-[#383838] transition hover:border-[#d40c2e] hover:text-[#d40c2e]';

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

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface NavbarProps {
  onRequestDemo: () => void;
}

const NAV_LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Pricing', href: '#pricing' },
];

export function Navbar({ onRequestDemo }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="animate-enter-fade sticky top-0 z-30 border-b border-white/10 bg-[#0a0c10]/82 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <img
              src="/compliance-icon.svg"
              alt="NeuralDocx"
              className="h-6 w-6 rounded-xl"
            />
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight text-white">
              NeuralDocx
            </p>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              AI compliance
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/eu-ai-act-checker"
            className="text-sm font-medium text-slate-200 transition hover:text-white"
          >
            Compliance Questionnaire
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="hidden text-slate-200 hover:text-white sm:inline-flex">
            <Link to="/login">Log in</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRequestDemo}
            className="hidden border-white/15 bg-white/[0.03] text-slate-100 hover:bg-white/[0.08] hover:text-white sm:inline-flex"
          >
            Request Demo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.03] p-0 text-slate-100 hover:bg-white/[0.08] hover:text-white lg:hidden"
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
          <Button asChild size="sm" className="bg-slate-200 text-slate-950 hover:bg-white">
            <Link to="/signup?type=company">Get Started</Link>
          </Button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-[#0a0c10]/96 px-5 py-4 sm:px-8 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={closeMobileMenu}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06] hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <Button asChild variant="ghost" className="justify-start rounded-2xl text-slate-200 hover:text-white">
              <Link to="/eu-ai-act-checker" onClick={closeMobileMenu}>
                Compliance Questionnaire
              </Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start rounded-2xl text-slate-200 hover:text-white">
              <Link to="/login" onClick={closeMobileMenu}>
                Log in
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                closeMobileMenu();
                onRequestDemo();
              }}
              className="justify-start rounded-2xl border-white/15 bg-white/[0.03] text-slate-100 hover:bg-white/[0.08] hover:text-white"
            >
              Request Demo
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

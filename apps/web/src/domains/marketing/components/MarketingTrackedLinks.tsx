import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { trackMarketingEvent } from '@/platform/analytics/marketing';
import {
  buildSubmitSystemHref,
  type SubmitSystemPackageInterest,
  type SubmitSystemSource,
} from '../lib/submit-system';
import { CALENDLY_URL } from '../lib/navigation';

interface MarketingSubmitSystemLinkProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  packageInterest?: SubmitSystemPackageInterest;
  source: SubmitSystemSource;
}

export function MarketingSubmitSystemLink({
  children,
  className,
  onClick,
  packageInterest,
  source,
}: MarketingSubmitSystemLinkProps) {
  return (
    <Link
      className={className}
      to={buildSubmitSystemHref({ packageInterest, source })}
      onClick={() => {
        trackMarketingEvent('marketing_submit_cta_clicked', {
          package_interest: packageInterest ?? null,
          source,
        });
        onClick?.();
      }}
    >
      {children}
    </Link>
  );
}

interface MarketingEnterpriseDemoLinkProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  source: SubmitSystemSource | 'pricing_enterprise';
}

export function MarketingEnterpriseDemoLink({
  children,
  className,
  onClick,
  source,
}: MarketingEnterpriseDemoLinkProps) {
  return (
    <a
      className={className}
      href={CALENDLY_URL}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        trackMarketingEvent('marketing_enterprise_cta_clicked', {
          source,
        });
        onClick?.();
      }}
    >
      {children}
    </a>
  );
}

export const CALENDLY_URL = 'https://calendly.com/neuraldocx';

export const MARKETING_NAV_LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Pricing', href: '#pricing' },
] as const;

export const MARKETING_SITE_NAV_LINKS = MARKETING_NAV_LINKS.map((link) => ({
  ...link,
  href: `/${link.href}`,
}));

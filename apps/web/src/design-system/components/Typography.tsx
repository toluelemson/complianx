import type { ReactNode, CSSProperties } from 'react';
import { palette } from '../tokens';

interface TypographyProps {
  children: ReactNode;
  variant?: 'h1' | 'h2' | 'body' | 'label';
}

const variantStyles: Record<NonNullable<TypographyProps['variant']>, CSSProperties> = {
  h1: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '2rem',
    fontWeight: 700,
    color: palette.text,
    margin: 0,
  },
  h2: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '1.5rem',
    fontWeight: 600,
    color: palette.text,
    margin: 0,
  },
  body: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '1rem',
    fontWeight: 400,
    color: palette.textMuted,
    margin: 0,
  },
  label: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: palette.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: 0,
  },
};

export function Typography({ children, variant = 'body' }: TypographyProps) {
  return <p style={variantStyles[variant]}>{children}</p>;
}

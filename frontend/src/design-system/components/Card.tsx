import { ReactNode } from 'react';
import { palette, radii, spacing } from '../tokens';

interface CardProps {
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function Card({ title, subtitle, footer, children }: CardProps) {
  return (
    <section
      style={{
        borderRadius: radii.lg,
        padding: spacing.lg,
        backgroundColor: palette.surface,
        border: `1px solid ${palette.border}`,
        boxShadow: '0 14px 40px rgba(15, 23, 42, 0.08)',
      }}
    >
      {(title || subtitle) && (
        <header className="mb-3">
          {title && (
            <p
              style={{
                margin: 0,
                fontWeight: 600,
                color: palette.text,
                fontSize: '1.1rem',
              }}
            >
              {title}
            </p>
          )}
          {subtitle && (
            <p
              style={{
                margin: 0,
                color: palette.textMuted,
                fontSize: '0.9rem',
              }}
            >
              {subtitle}
            </p>
          )}
        </header>
      )}
      <div style={{ marginBottom: footer ? spacing.md : 0 }}>{children}</div>
      {footer && <footer>{footer}</footer>}
    </section>
  );
}

import { ReactNode, ButtonHTMLAttributes } from 'react';
import { palette, spacing, radii } from '../tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
}

const sizePadding: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: '0.35rem 0.9rem',
  md: '0.5rem 1.2rem',
  lg: '0.75rem 1.6rem',
};

const variantStyles: Record<ButtonVariant, Record<string, string>> = {
  primary: {
    backgroundColor: palette.primary,
    color: '#fff',
    borderColor: palette.primary,
  },
  secondary: {
    backgroundColor: palette.secondary,
    color: '#fff',
    borderColor: palette.secondary,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: palette.primaryDark,
    borderColor: palette.border,
  },
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const padding = sizePadding[size];
  const variantStyle = variantStyles[variant];
  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding,
        backgroundColor: variantStyle.backgroundColor,
        color: variantStyle.color,
        border: `1px solid ${variantStyle.borderColor}`,
        borderRadius: radii.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'transform 120ms ease, box-shadow 120ms ease',
        boxShadow: disabled ? 'none' : '0 8px 24px rgba(15, 23, 42, 0.08)',
        ...(style ?? {}),
      }}
      onMouseDown={(event) => {
        if (!disabled) {
          (event.currentTarget as HTMLElement).style.transform = 'translateY(1px)';
        }
      }}
      onMouseUp={(event) => {
        if (!disabled) {
          (event.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        }
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

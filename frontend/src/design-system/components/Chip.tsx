import { palette, spacing, radii } from '../tokens';

interface ChipProps {
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'alert';
}

const toneStyles: Record<NonNullable<ChipProps['tone']>, { background: string; color: string }> = {
  default: { background: palette.muted, color: palette.text },
  success: { background: '#dcfce7', color: '#15803d' },
  warning: { background: '#fefac3', color: '#92400e' },
  alert: { background: '#fee2e2', color: '#b91c1c' },
};

export function Chip({ label, tone = 'default' }: ChipProps) {
  const styles = toneStyles[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: `${spacing.xs}px ${spacing.sm}px`,
        borderRadius: radii.sm,
        backgroundColor: styles.background,
        color: styles.color,
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </span>
  );
}

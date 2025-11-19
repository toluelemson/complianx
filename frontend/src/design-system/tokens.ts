export const palette = {
  primary: '#0ea5e9',
  primaryDark: '#0369a1',
  secondary: '#ec4899',
  accent: '#fbbf24',
  surface: '#ffffff',
  muted: '#f1f5f9',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#475569',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 12,
  lg: 18,
} as const;

export const typography = {
  heading: '600 1.5rem/1.4 Inter, system-ui, sans-serif',
  body: '400 1rem/1.6 Inter, system-ui, sans-serif',
} as const;

export type Palette = typeof palette;
export type Spacing = typeof spacing;
export type Radii = typeof radii;

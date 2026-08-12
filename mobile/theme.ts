/**
 * Theme foundation -- Phase 6B expands Phase 6A's placeholder with the
 * reusable tokens the real screens need (typography sizes, spacing,
 * radius), still deliberately NOT final branding: no dark-mode switching,
 * no per-component styles baked in here. Colors are unchanged from
 * Phase 6A, still mirroring app/globals.css's :root light-mode values.
 */
export const colors = {
  background: "#fbfaf7",
  surface: "#ffffff",
  foreground: "#211c16",
  muted: "#6b6259",
  border: "#e3dcd0",
  accent: "#7a3b2e",
} as const;

export const typography = {
  title: 22,
  heading: 17,
  body: 15,
  small: 13,
  eyebrow: 12,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
} as const;

/**
 * Theme placeholder -- Phase 6A foundation only.
 *
 * Mirrors the light-mode token VALUES already established in the Next.js
 * reference app (app/globals.css's :root block) so the two apps start
 * from the same restrained, scholarly palette rather than two
 * independently-invented ones. This is deliberately NOT a real mobile
 * theme system yet -- no dark-mode switching, no typography scale, no
 * spacing scale, no component-level tokens. Building that out belongs to
 * a later phase once actual screens exist to apply it to.
 */
export const colors = {
  background: "#fbfaf7",
  surface: "#ffffff",
  foreground: "#211c16",
  muted: "#6b6259",
  border: "#e3dcd0",
  accent: "#7a3b2e",
} as const;

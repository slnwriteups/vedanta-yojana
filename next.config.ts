import type { NextConfig } from "next";

// Phase 5B scaffold: intentionally minimal. No image domains, redirects,
// or headers are configured yet — those belong to later phases (media
// strategy, old-URL redirects) once real content exists to inform them.
const nextConfig: NextConfig = {
  // Next.js 16 auto-writes AGENTS.md/CLAUDE.md into the repo root on every
  // `next dev`/`next build`. Disabled: an unrequested, repeatedly
  // self-regenerating file outside this phase's (or any phase's) scope.
  agentRules: false,
};

export default nextConfig;

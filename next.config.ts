import type { NextConfig } from "next";

// script-src includes 'unsafe-inline' as a deliberate, considered trade-off,
// not an oversight: a per-request nonce (the strict alternative) can't work
// for statically-generated pages like `/` and `/create` — their HTML is
// rendered once at build time, before any request (and its nonce) exists,
// so a nonce baked in then can never match a later request's CSP header.
// That's a fundamental conflict with Next.js static generation, not a
// config mistake, and this app leans on static generation for a fast first
// paint on the pages messaging apps' link previews hit. In exchange,
// `script-src 'self'` still blocks loading any attacker-controlled *external*
// script (the dominant real-world XSS vector), and nothing in this app uses
// `dangerouslySetInnerHTML` — React's default escaping plus the other
// directives below (no plugins, no framing, no foreign form targets) do the
// rest of the work.
// React's dev-mode-only debugging helpers (reconstructing cross-realm call
// stacks, Fast Refresh) use eval() — never in production, per React itself.
// Without this, `next dev` logs a spurious "eval() is not supported" error
// on every page. NODE_ENV is fixed for the lifetime of this config (set by
// `next dev` vs `next build`/`next start`), so this is safe to resolve once
// here rather than per-request.
const devEval = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${devEval}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  // canvas-confetti renders off the main thread via a blob: Worker.
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Lean, self-contained production build for the Docker image (see
  // Dockerfile) — bundles only the files `next start` actually needs.
  output: "standalone",
  // @node-rs/argon2's native binary is loaded via a dynamic require the
  // file tracer can miss — include it explicitly so hashing still works
  // in the standalone build.
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@node-rs/argon2-*/**/*"],
  },
  async headers() {
    return [
      {
        // Applies to every route.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
      {
        // Poll pages carry participant/host-identifying links; keep them
        // out of search indexes even though the IDs are already
        // non-guessable (defense in depth per the security plan).
        source: "/p/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;

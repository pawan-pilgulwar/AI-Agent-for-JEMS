import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// In dev, Next's HMR uses a websocket + eval; allow them so live-reload keeps
// working. Production stays locked down.
const connectSrc = isDev
  ? "connect-src 'self' https://api.dicebear.com ws: wss:"
  : "connect-src 'self' https://api.dicebear.com";

/**
 * Security response headers applied to every route. These mitigate common
 * client-side attacks: clickjacking, MIME sniffing, referrer leakage, and
 * unwanted access to device APIs. HSTS forces HTTPS once seen.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // Allows the app's own assets, inline styles/scripts Next needs, plus the
    // external avatar sources we render (DiceBear + GitHub).
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://api.dicebear.com https://avatars.githubusercontent.com",
      "font-src 'self' data:",
      connectSrc,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;


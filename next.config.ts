import type { NextConfig } from "next";

/**
 * HSTS hanya untuk situs https sungguhan. Mengirimkannya ke localhost bisa
 * mengunci browser developer (Chrome menyimpan HSTS per hostname), jadi
 * dipasang sekunder — bukan berdasar NODE_ENV, karena `next start` produksi
 * pun masih sering dijalankan di localhost saat audit.
 */
const isSecureSite = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith(
  "https://",
);

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.tiktok.com https://*.tiktok.com https://*.byteoversea.com https://*.ibytedtos.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https: https://*.tiktokcdn.com https://*.tiktok.com https://*.byteoversea.com https://*.ibytedtos.com",
  "font-src 'self' data: https:",
  "media-src 'self' blob: https://cdn.equran.id https://*.equran.id https:",
  "frame-src 'self' blob: https://www.tiktok.com https://*.tiktok.com https://www.google.com https://maps.google.com",
  "connect-src 'self' https://api.myquran.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.tiktok.com https://*.tiktok.com https://*.byteoversea.com https:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  // Auditor XSS bawaan browser sudah pensiun dan justru bisa memicu bug;
  // penggantinya adalah CSP, bukan header ini. Lihat catatan di bawah.
  { key: "X-XSS-Protection", value: "0" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isSecureSite
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async rewrites() {
    return [
      { source: '/artikel', destination: '/berita' },
      { source: '/artikel/:slug*', destination: '/berita/:slug*' },
    ];
  },
};

export default nextConfig;

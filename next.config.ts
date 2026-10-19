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

const securityHeaders = [
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
};

export default nextConfig;

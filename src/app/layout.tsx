import type { Metadata } from "next";
import localFont from "next/font/local";
import { buildRootMetadata } from "@/lib/seo";
import { getSetting } from "@/lib/settings";
import "./globals.css";

const jakarta = localFont({
  src: [
    { path: "./fonts/plus-jakarta-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/plus-jakarta-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/plus-jakarta-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/plus-jakarta-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-jakarta",
  display: "swap",
});

const amiri = localFont({
  src: [
    { path: "./fonts/amiri-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/amiri-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-amiri",
  display: "swap",
});

const geistMono = localFont({
  src: [
    {
      path: "./fonts/geist-mono-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-geist-mono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const [seoTitle, seoDescription, siteName] = await Promise.all([
    getSetting("seo.title", ""),
    getSetting("seo.description", ""),
    getSetting("site.name", ""),
  ]);
  return buildRootMetadata({ seoTitle, seoDescription, siteName });
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${jakarta.variable} ${amiri.variable} ${geistMono.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}

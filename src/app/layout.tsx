// src/app/layout.tsx
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import Footer from "@/components/footer";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { SITE_NAME, TAGLINE, DESCRIPTION, SITE_URL } from "@/lib/site";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  referrer: "origin-when-cross-origin",
  keywords: [
    "pet activity log",
    "voice pet tracker",
    "pet sitter log",
    "voice first pet app",
    "pet care records",
  ],
  authors: [{ name: SITE_NAME }],
  openGraph: {
    type: "website",
    title: `${SITE_NAME} — ${TAGLINE}`,
    description: DESCRIPTION,
    siteName: SITE_NAME,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${TAGLINE}`,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfff0" },
    { media: "(prefers-color-scheme: dark)", color: "#16140f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${geist.variable} ${geistMono.variable}`}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ConvexClientProvider>
            {children}
            <Footer />
          </ConvexClientProvider>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}

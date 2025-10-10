// src/app/layout.tsx
import { ConvexClientProvider } from "./ConvexClientProvider";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { ThemeProvider } from "next-themes"; // ✅ For smooth dark mode

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* ✅ Wrap with ThemeProvider for dark mode */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ConvexClientProvider>
            {children}
            <Analytics />
            {/* ✅ Dodo Payments SDK */}
            <script src="https://js.dodopayments.com/v1/dodo.js" async />
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
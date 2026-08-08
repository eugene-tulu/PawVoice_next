// src/app/layout.tsx
import { ConvexClientProvider } from "./ConvexClientProvider";
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
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
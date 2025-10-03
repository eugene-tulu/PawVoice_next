// src/app/layout.tsx
import { ConvexClientProvider } from "./ConvexClientProvider";
import { Analytics } from "@vercel/analytics/react"; // ← 1 line
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>
          {children}
          <Analytics />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
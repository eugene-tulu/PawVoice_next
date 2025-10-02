// src/app/layout.tsx
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css"; // includes Tailwind

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
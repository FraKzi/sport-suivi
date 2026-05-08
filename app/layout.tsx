import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";

export const metadata: Metadata = {
  title: "Sport Suivi",
  description: "Programme musculation, plan alimentaire et progression",
  applicationName: "Sport Suivi",
  appleWebApp: {
    capable: true,
    title: "Sport Suivi",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d10",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-border bg-surface sticky top-0 z-10">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <Link href="/" className="font-semibold text-lg whitespace-nowrap">
                💪 Sport Suivi
              </Link>
              <NavLinks />
            </div>
          </header>
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
          <footer className="border-t border-border text-xs text-muted py-3 text-center">
            Données chiffrées · Postgres Neon
          </footer>
        </div>
      </body>
    </html>
  );
}

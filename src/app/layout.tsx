import type { Metadata, Viewport } from "next";
import "./globals.css";
import { themaKeuze } from "@/lib/thema";

export const metadata: Metadata = {
  title: { default: "Zorgrooster", template: "%s · Zorgrooster" },
  description: "Rooster en verlof voor het zorgteam",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1d4ed8" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const thema = await themaKeuze();
  return (
    <html lang="nl" className={thema ?? undefined}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}

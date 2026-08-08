import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { headers } from "next/headers";

import "./globals.css";
import { RouteTransitionProvider } from "@/components/navigation/route-transition-provider";
import { nonceHeaderName } from "@/lib/csp";
import { getThemeBootScript } from "@/lib/theme";

const heading = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  preload: false,
  variable: "--font-heading"
});

const body = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  preload: false,
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "Duet",
  description: "Warm editorial couple finance experience for web and Telegram"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom stays available: locking it out breaks accessibility for anyone
  // who needs to magnify amounts.
  viewportFit: "cover"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Nonce comes from middleware.ts and authorises the inline theme bootstrap
  // under the Content-Security-Policy set there.
  const nonce = (await headers()).get(nonceHeaderName) ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: getThemeBootScript() }} />
      </head>
      <body className={`${heading.variable} ${body.variable}`}>
        <RouteTransitionProvider>{children}</RouteTransitionProvider>
      </body>
    </html>
  );
}

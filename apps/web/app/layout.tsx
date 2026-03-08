import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";

import "./globals.css";
import { RouteTransitionProvider } from "@/components/navigation/route-transition-provider";
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeBootScript() }} />
      </head>
      <body className={`${heading.variable} ${body.variable}`}>
        <RouteTransitionProvider>{children}</RouteTransitionProvider>
      </body>
    </html>
  );
}

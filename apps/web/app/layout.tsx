import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";

import "./globals.css";
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeBootScript() }} />
      </head>
      <body className={`${heading.variable} ${body.variable}`}>
        <div className="page-shell">{children}</div>
      </body>
    </html>
  );
}

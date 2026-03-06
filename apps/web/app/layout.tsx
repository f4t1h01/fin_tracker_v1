import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";

import { ThemeToggle } from "@/components/theme-toggle";

import "./globals.css";

const heading = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading"
});

const body = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "Couple Finance Tracker",
  description: "Telegram-native couple finance tracking"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${heading.variable} ${body.variable} noise font-[family-name:var(--font-body)]`}>
        <ThemeToggle />
        <div className="page-shell">{children}</div>
      </body>
    </html>
  );
}

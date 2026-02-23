import Link from "next/link";
import { ArrowRight, Bot, Link2, Wallet2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Bot,
    title: "Start from Telegram",
    text: "Use /start and tap Open app to jump straight into your finance profile."
  },
  {
    icon: Wallet2,
    title: "Track in one place",
    text: "Add income or expense quickly and keep your running monthly balance visible."
  },
  {
    icon: Link2,
    title: "Connect by code",
    text: "Pair with your partner using short unique couple codes without sharing passwords."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8">
      <header className="mb-12 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-white/60">shaxin.uz project</p>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl">Couple Finance Tracker</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/profile">
              Open Profile <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <Card className="border-white/20 bg-white/10">
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-heading)] text-4xl leading-tight">
              Smart couple finance, starting with one tap.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base text-white/75">
              Open the app from Telegram /start, authenticate instantly, track money, and connect with your partner by code.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/profile">Go to profile</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin">Admin</Link>
            </Button>
          </CardContent>
        </Card>

        <Card id="setup">
          <CardHeader>
            <CardTitle>Current Bot Flow</CardTitle>
            <CardDescription>Only one command is needed now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-white/75">
            <p>1) Open your bot in Telegram</p>
            <p>2) Send `/start`</p>
            <p>3) Tap `Open app`</p>
            <p>4) Manage profile, transactions, and couple binding</p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <Card key={title}>
            <CardHeader>
              <Icon className="size-6 text-pop" />
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/70">{text}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}

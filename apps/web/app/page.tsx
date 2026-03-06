import Link from "next/link";
import { ArrowRight, Bot, Link2, Wallet2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Bot,
    title: "Telegram or Web",
    text: "Open from Telegram for instant context, or sign in on the website with saved email credentials."
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
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8">
      <header className="soft-rise mb-12 flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-sm uppercase tracking-[0.18em]">shaxin.uz project</p>
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
        <Card className="panel-soft">
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-heading)] text-4xl leading-tight">
              Smart couple finance, ready from bot or browser.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Use Telegram for fast entry, or continue on the website with email login. Track money together and connect with your partner by code.
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
            <CardTitle>How access works</CardTitle>
            <CardDescription>Pick the entry point that fits the moment.</CardDescription>
          </CardHeader>
          <CardContent className="body-muted space-y-2 text-sm">
            <p>1) Use Telegram `/start` and tap `Open app` for instant entry</p>
            <p>2) Save email login once from profile</p>
            <p>3) Come back later directly from the website if you want</p>
            <p>4) Telegram can still refresh linked chat context on future opens</p>
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
               <p className="body-muted text-sm">{text}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}

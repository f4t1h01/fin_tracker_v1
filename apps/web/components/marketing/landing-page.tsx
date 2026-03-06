"use client";

import Link from "next/link";
import { Eyebrow } from "@/components/marketing/eyebrow";
import { MarketingEffects, NavShell } from "@/components/marketing/marketing-effects";
import { ThemeToggle } from "@/components/theme-toggle";

const tickerItems = ["shared balance", "private & safe", "telegram instant entry", "live spending", "partner sync", "soft reminders"];

const features = [
  { index: "01", icon: "✦", title: "Instant Entry", text: "Step in from Telegram or the web without breaking the flow of your day." },
  { index: "02", icon: "∞", title: "Partner Sync", text: "See the same financial picture and make decisions from one shared source of truth." },
  { index: "03", icon: "◌", title: "Live Balance", text: "Track income, expenses, and your running couple balance in one calm workspace." },
  { index: "04", icon: "♡", title: "Shared Goals", text: "Move from raw transactions to money habits that actually support your life together." },
  { index: "05", icon: "↗", title: "Telegram Bot", text: "Open instantly from chat when speed matters, then keep working from the browser later." },
  { index: "06", icon: "☉", title: "Private & Safe", text: "Keep credentials, pairing, and personal finance actions deliberate and protected." }
];

const steps = [
  { number: "01", title: "Open", text: "Start from Telegram or from the website whenever you need it." },
  { number: "02", title: "Track", text: "Capture income and spending in a shared financial picture." },
  { number: "03", title: "Connect", text: "Pair with your partner using a couple code instead of awkward manual sharing." },
  { number: "04", title: "Adjust", text: "Review, edit, filter, and refine the story behind your money together." }
];

const stats = [
  { value: "1<sup>x</sup>", label: "Shared Source" },
  { value: "24<sup>s</sup>", label: "Always Available" },
  { value: "2<sup>♥</sup>", label: "People Aligned" },
  { value: "∞", label: "Long-Term Clarity" }
];

const footerColumns = [
  { title: "Product", links: ["Overview", "Login", "Profile"] },
  { title: "Company", links: ["About", "Roadmap", "Support"] },
  { title: "Legal", links: ["Privacy", "Terms", "Security"] }
];

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="primary-button" href={href}>
      <span>{children}</span>
    </Link>
  );
}

function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="secondary-link" href={href}>
      <span>{children}</span>
      <span aria-hidden>→</span>
    </Link>
  );
}

export function LandingPage() {
  const doubledTicker = [...tickerItems, ...tickerItems];

  return (
    <>
      <MarketingEffects />
      <NavShell>
        <Link className="logo-mark" href="#top">
          <span>Duet</span>
          <span className="logo-dot" />
        </Link>

        <div className="nav-links">
          <Link className="nav-link" href="#features">Features</Link>
          <Link className="nav-link" href="#how-it-works">How it works</Link>
          <Link className="nav-link" href="#couples">Couples</Link>
          <ThemeToggle />
          <PrimaryLink href="/login">Get Started</PrimaryLink>
        </div>
      </NavShell>

      <main id="top">
        <section className="hero-section">
          <div className="container-shell hero-grid">
            <div className="hero-copy">
              <div data-seq="1"><Eyebrow>Couple Finance Tracker</Eyebrow></div>
              <h1 className="hero-title" data-seq="2">A warmer way to see your <em>money together</em>.</h1>
              <p className="hero-description" data-seq="3">
                Duet helps couples track everyday spending, hold one shared picture, and move between Telegram and web without losing rhythm. It feels more like a printed financial journal than a noisy dashboard.
              </p>
              <div className="hero-ctas" data-seq="4">
                <PrimaryLink href="/login">Open your workspace</PrimaryLink>
                <SecondaryLink href="#features">Explore the system</SecondaryLink>
              </div>
            </div>

            <div className="hero-visual" aria-hidden>
              <div className="hero-orb hero-orb--gold" />
              <div className="hero-orb hero-orb--blush" />
              <div className="hero-orb hero-orb--sage" />
              <svg className="hero-lines" fill="none" viewBox="0 0 800 700">
                <path d="M40 110L470 680" stroke="rgba(201,168,76,0.05)" />
                <path d="M220 40L760 420" stroke="rgba(201,168,76,0.04)" />
                <circle cx="620" cy="200" r="120" stroke="rgba(201,168,76,0.04)" />
                <circle cx="620" cy="200" r="180" stroke="rgba(201,168,76,0.025)" />
              </svg>

              <div className="floating-card floating-card--left">
                <p className="phone-label">Savings Goal</p>
                <p style={{ fontFamily: "var(--font-heading)", fontSize: "20px" }}>12.4M UZS</p>
                <p className="phone-label">57% funded</p>
              </div>

              <div className="phone-shell">
                <div className="phone-screen">
                  <div className="phone-notch" />
                  <p className="phone-label">Good evening, both of you</p>
                  <div className="phone-balance">18.4<span>m</span> UZS</div>
                  <div className="phone-summary">
                    <p className="phone-label" style={{ color: "rgba(245,240,232,0.55)" }}>Shared balance</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 }}>
                      <strong style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 300 }}>+2.1m</strong>
                      <span style={{ color: "rgba(245,240,232,0.55)", fontSize: 12 }}>this month</span>
                    </div>
                  </div>
                  <div className="phone-list">
                    {[{ name: "Groceries", meta: "Today · Duet", amount: "-145k", cls: "amount-negative" }, { name: "Salary", meta: "Today · Fatih", amount: "+6.2m", cls: "amount-positive" }, { name: "Cafe", meta: "Yesterday · Duet", amount: "-92k", cls: "amount-negative" }, { name: "Transport", meta: "Yesterday · Partner", amount: "-38k", cls: "amount-negative" }].map((item) => (
                      <div className="phone-row" key={item.name}>
                        <div>
                          <p style={{ fontWeight: 500 }}>{item.name}</p>
                          <p className="phone-label">{item.meta}</p>
                        </div>
                        <strong className={item.cls}>{item.amount}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="floating-card floating-card--right">
                <p className="phone-label">Partner spend</p>
                <p style={{ fontFamily: "var(--font-heading)", fontSize: "20px" }}>428k UZS</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: "var(--sage)" }} />
                  <span style={{ fontSize: 10, color: "var(--ink-soft)", letterSpacing: "0.15em", textTransform: "uppercase" }}>on track</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ticker-band" aria-label="Highlights ticker">
          <div className="ticker-track">
            {doubledTicker.map((item, index) => (
              <span className="ticker-item" key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        </section>

        <section className="section-block" id="features">
          <div className="container-shell">
            <div className="section-header" data-reveal>
              <div>
                <Eyebrow>Features</Eyebrow>
                <h2 className="section-title">Everything a couple needs to <em>thrive</em>.</h2>
              </div>
              <p className="section-note">A calm money workspace should help you feel aligned, not overwhelmed. Duet keeps the system clear, shared, and intentionally paced.</p>
            </div>

            <div className="feature-grid">
              {features.map((feature, index) => (
                <article className="feature-card" data-reveal key={feature.title} style={{ transitionDelay: `${index * 0.1}s` }}>
                  <p className="feature-index">{feature.index}</p>
                  <div className="feature-icon">{feature.icon}</div>
                  <div className="feature-line" />
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-copy" style={{ marginTop: 18 }}>{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-block dark-section" id="how-it-works">
          <div className="container-shell">
            <div style={{ textAlign: "center", marginBottom: 72 }} data-reveal>
              <Eyebrow className="justify-center">How it works</Eyebrow>
              <h2 className="section-title" style={{ color: "var(--cream)" }}>Four quiet steps to shared financial <em>clarity</em>.</h2>
            </div>

            <div className="steps-grid">
              {steps.map((step, index) => (
                <article className="step-card" data-reveal key={step.number} style={{ transitionDelay: `${index * 0.15}s` }}>
                  <div className="step-circle"><span className="step-number">{step.number}</span></div>
                  <h4 className="step-title">{step.title}</h4>
                  <p className="step-copy" style={{ marginTop: 14 }}>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-block" style={{ paddingTop: 80, paddingBottom: 80 }}>
          <div className="container-shell stats-grid">
            {stats.map((stat) => (
              <div className="stat-tile" data-reveal key={stat.label} dangerouslySetInnerHTML={{ __html: `<div class='stat-value'>${stat.value}</div><div class='stat-label'>${stat.label}</div>` }} />
            ))}
          </div>
        </section>

        <section className="section-block" id="couples">
          <div className="container-shell">
            <div className="connect-card" data-reveal>
              <div>
                <Eyebrow>Couple sync</Eyebrow>
                <h2 className="section-title">One code. Two people. A clearer <em>picture</em>.</h2>
                <p className="connect-copy" style={{ marginTop: 20 }}>
                  Share one short code, pair your spaces, and stop translating your spending story manually. The system should make connection feel intentional and elegant.
                </p>
              </div>
              <div className="connect-visual">
                <div className="avatar-circle avatar-circle--ink">F</div>
                <div className="code-bridge">
                  <div className="code-box">A8 C2 P4</div>
                  <div className="phone-label">Couple code</div>
                  <div className="heart-beat">♥</div>
                </div>
                <div className="avatar-circle avatar-circle--blush">N</div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-block testimonial-section">
          <div className="testimonial-quote-mark">“</div>
          <div className="container-shell" data-reveal>
            <blockquote className="testimonial-blockquote">
              For the first time, our budget stopped feeling like a spreadsheet fight and started feeling like one calm conversation.
            </blockquote>
            <p className="testimonial-cite">Real couple · early Duet user</p>
          </div>
        </section>

        <section className="section-block cta-section">
          <div className="container-shell" data-reveal style={{ textAlign: "center" }}>
            <Eyebrow className="justify-center">Start now</Eyebrow>
            <h2 className="cta-title">Build a gentler rhythm around your <em>money</em>.</h2>
            <p className="section-note" style={{ maxWidth: 460, margin: "20px auto 0" }}>Move between Telegram and the web, keep one shared balance in sight, and make every financial decision feel more aligned.</p>
            <div className="hero-ctas" style={{ justifyContent: "center" }}>
              <PrimaryLink href="/login">Get Started</PrimaryLink>
              <SecondaryLink href="/profile">Open workspace</SecondaryLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer-shell">
        <div className="container-shell footer-grid">
          <div>
            <div className="logo-mark" style={{ color: "var(--cream)" }}>
              <span>Duet</span>
              <span className="logo-dot" />
            </div>
            <p className="footer-copy" style={{ marginTop: 18, maxWidth: 280 }}>
              Editorial calm for shared finances — built for partners who want one beautiful picture, not another noisy tool.
            </p>
          </div>
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h5 className="footer-heading">{column.title}</h5>
              {column.links.map((link) => (
                <a className="footer-link" href="#top" key={link}>{link}</a>
              ))}
            </div>
          ))}
        </div>
        <div className="container-shell footer-bottom">
          <span>© 2026 Duet. All rights reserved.</span>
          <span>Made for two people, one picture, and a little more ♥ calm.</span>
        </div>
      </footer>
    </>
  );
}

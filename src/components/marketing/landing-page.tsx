import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { TierComparison } from "@/components/marketing/tier-comparison";

const CAPABILITIES = [
  {
    title: "Contract Forensics",
    body: "Drop a CA. Get price, liquidity, deployer, honeypot flags, and a filtered holder roster in seconds.",
  },
  {
    title: "Wallet Deep-Dive",
    body: "Analyze any holder — fund origin, trade history, PNL estimate, and top portfolio positions.",
  },
  {
    title: "Live Tracking",
    body: "Pin wallets to your sidebar. Auto-refresh activity. Alpha ratings from 0–100 with tier labels.",
  },
  {
    title: "Syndicate Detection",
    body: "Cross-token insider overlap, shared fund tracing, and FBI-style network graphs over 1–3 months.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <MarketingHeader />

      <main>
        <section className="border-b border-[var(--border)] px-6 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <p className="text-[10px] tracking-[0.35em] text-[var(--accent)]">
              ON-CHAIN INTELLIGENCE TERMINAL
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl leading-tight md:text-5xl">
              Expose who holds.
              <br />
              <span className="text-[var(--accent)]">Expose who they run with.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)] md:text-base">
              EXPOSED.OS is a browser-based Ethereum forensics terminal. Paste a
              contract address, map the holders, trace their funding, and uncover
              wallet syndicates that buy together — or lose together.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/app"
                className="border border-[var(--accent)] bg-[var(--accent)] px-6 py-3 text-xs tracking-widest text-[var(--bg)]"
              >
                LAUNCH TERMINAL
              </Link>
              <Link
                href="/pricing"
                className="border border-[var(--border)] px-6 py-3 text-xs tracking-widest text-[var(--text-primary)] hover:border-[var(--accent)]"
              >
                VIEW PRICING
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 py-14">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-sm tracking-[0.2em] text-[var(--text-secondary)]">
              CAPABILITIES
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {CAPABILITIES.map((cap) => (
                <div
                  key={cap.title}
                  className="border border-[var(--border)] bg-[var(--bg-panel)] p-5"
                >
                  <h3 className="text-[var(--accent)]">{cap.title}</h3>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {cap.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--border)] bg-[var(--bg-panel)] px-6 py-14">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-sm tracking-[0.2em] text-[var(--text-secondary)]">
              FREE VS PRO
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
              Start free with guest mode or Telegram. Upgrade when you need wallet
              targeting, live tracking, and syndicate maps.
            </p>
            <div className="mt-8">
              <TierComparison />
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/pricing"
                className="text-sm text-[var(--accent)] underline"
              >
                Compare plans & pay with crypto →
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 py-14">
          <div className="mx-auto max-w-6xl text-center">
            <p className="text-[10px] tracking-[0.3em] text-[var(--text-secondary)]">
              READY TO EXPOSE
            </p>
            <Link
              href="/app"
              className="mt-4 inline-block border border-[var(--accent)] px-8 py-3 text-xs tracking-widest text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]"
            >
              ENTER TERMINAL
            </Link>
            <p className="mt-4 text-[11px] text-[var(--text-secondary)]">
              Telegram login · Guest mode (5 searches) · Crypto-only Pro billing
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] px-6 py-6 text-center text-[10px] text-[var(--text-secondary)]">
        EXPOSED.OS — Ethereum mainnet forensics · Not financial advice
      </footer>
    </div>
  );
}

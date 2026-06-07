"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { TierComparison } from "@/components/marketing/tier-comparison";
import type { PlanInterval } from "@/lib/billing/types";

interface PricingData {
  plans: Array<{
    interval: PlanInterval;
    label: string;
    targetUsd: number;
    holderUsd: number;
    tokensRequired: number | null;
    tokensRequiredHolder: number | null;
    ethRequired: number | null;
    ethRequiredHolder: number | null;
    days: number;
  }>;
  settings: {
    tokenSymbol: string;
    tokenContract: string;
    treasuryAddress: string;
    holderDiscountPercent: number;
  };
  ethPriceUsd: number | null;
  proBenefits: string[];
  upgradeNote: string;
}

export function PricingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["pricing"],
    queryFn: async () => {
      const res = await fetch("/api/pricing");
      return res.json() as Promise<PricingData>;
    },
  });

  const [selectedPlan, setSelectedPlan] = useState<PlanInterval>("monthly");
  const [wallet, setWallet] = useState("");
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const plan = data?.plans.find((p) => p.interval === selectedPlan);

  const payHolder = async () => {
    setError("");
    setMessage("");
    const res = await fetch("/api/subscription/holder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: selectedPlan, walletAddress: wallet }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed");
      return;
    }
    setMessage(json.message ?? "Subscribed via holder access");
  };

  const payCrypto = async () => {
    setError("");
    setMessage("");
    const res = await fetch("/api/subscription/crypto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: selectedPlan, txHash, fromWallet: wallet }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed");
      return;
    }
    setMessage(`Pro active until ${new Date(json.expiresAt).toLocaleDateString()}`);
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-[var(--bg)] p-8 text-[var(--text-secondary)]">
        LOADING PRICING...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <MarketingHeader />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl">Pricing</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--text-secondary)]">
          EXPOSED.OS is free for contract recon. Pro unlocks wallet targeting,
          live tracking, cross-analysis, fund tracing, and syndicate network maps.
          Pay with crypto only — ETH or hold {data.settings.tokenSymbol} tokens.
        </p>

        <section className="mt-10">
          <h2 className="text-sm tracking-[0.2em] text-[var(--text-secondary)]">
            FREE VS PRO
          </h2>
          <div className="mt-6">
            <TierComparison compact />
          </div>
        </section>

        <section className="mt-12 border-t border-[var(--border)] pt-10">
          <h2 className="text-sm tracking-[0.2em] text-[var(--accent)]">
            PRO PLANS
          </h2>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            {data.upgradeNote}
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {data.plans.map((p) => (
              <button
                key={p.interval}
                type="button"
                onClick={() => setSelectedPlan(p.interval)}
                className={`border p-5 text-left transition ${
                  selectedPlan === p.interval
                    ? "border-[var(--accent)] bg-[var(--bg-panel)]"
                    : "border-[var(--border)] hover:border-[var(--text-secondary)]"
                }`}
              >
                <div className="text-xs tracking-widest text-[var(--text-secondary)]">
                  {p.label.toUpperCase()}
                </div>
                <div className="mt-2 text-3xl">${p.targetUsd}</div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">
                  ~${p.holderUsd.toFixed(0)} with {data.settings.holderDiscountPercent}%
                  holder discount
                </div>
                {p.tokensRequired ? (
                  <div className="mt-3 text-[11px] text-[var(--accent)]">
                    Hold ~
                    {p.tokensRequiredHolder?.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    {data.settings.tokenSymbol} tokens
                  </div>
                ) : (
                  <div className="mt-3 text-[11px] text-[var(--warning)]">
                    Token price pending launch
                  </div>
                )}
                {p.ethRequired ? (
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    or {p.ethRequiredHolder?.toFixed(4)} ETH
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="border border-[var(--border)] bg-[var(--bg-panel)] p-5">
            <h2 className="text-sm tracking-widest text-[var(--accent)]">
              HOLD {data.settings.tokenSymbol} TOKENS
            </h2>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Token amount auto-adjusts with market cap so USD cost stays ~flat.
            </p>
            <input
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="0x... wallet holding tokens"
              className="mt-4 w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void payHolder()}
              className="mt-3 border border-[var(--accent)] px-4 py-2 text-xs text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]"
            >
              VERIFY HOLDER ACCESS
            </button>
          </section>

          <section className="border border-[var(--border)] bg-[var(--bg-panel)] p-5">
            <h2 className="text-sm tracking-widest text-[var(--accent)]">
              PAY WITH ETH
            </h2>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Send ETH to treasury, paste tx hash. No cards.
            </p>
            {data.settings.treasuryAddress ? (
              <p className="mt-2 break-all font-mono text-[11px] text-[var(--warning)]">
                {data.settings.treasuryAddress}
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-[var(--danger)]">
                Treasury not configured yet
              </p>
            )}
            <input
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="0x... transaction hash"
              className="mt-4 w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void payCrypto()}
              className="mt-3 border border-[var(--accent)] px-4 py-2 text-xs text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]"
            >
              VERIFY PAYMENT
            </button>
          </section>
        </div>

        <section className="mt-8 border border-[var(--border)] p-5">
          <h2 className="text-sm tracking-widest text-[var(--text-secondary)]">
            ALL PRO FEATURES
          </h2>
          <ul className="mt-3 grid gap-1 text-sm md:grid-cols-2">
            {data.proBenefits.map((b) => (
              <li key={b}>→ {b}</li>
            ))}
          </ul>
        </section>

        <div className="mt-8 text-center">
          <Link
            href="/app"
            className="inline-block border border-[var(--accent)] px-6 py-2 text-xs tracking-widest text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]"
          >
            LAUNCH TERMINAL
          </Link>
        </div>

        {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}
        {message ? (
          <p className="mt-4 text-sm text-[var(--success)]">{message}</p>
        ) : null}
      </main>
    </div>
  );
}

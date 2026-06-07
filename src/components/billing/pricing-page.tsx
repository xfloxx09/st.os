"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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
      <header className="border-b border-[var(--border)] bg-[var(--bg-panel)] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="tracking-[0.25em] text-[var(--accent)]">
            CA.OS
          </Link>
          <Link href="/" className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)]">
            ← Terminal
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl">Choose Your Edge</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
          {data.upgradeNote}
        </p>
        <p className="mt-2 text-xs text-[var(--warning)]">
          Inspired by holder-access models like{" "}
          <a
            href="https://themarketstalker.com/#pricing"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            Market Stalker
          </a>{" "}
          — CA.OS is a separate product. Pay crypto only.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
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
                ~${p.holderUsd.toFixed(0)} with {data.settings.holderDiscountPercent}% holder discount
              </div>
              {p.tokensRequired ? (
                <div className="mt-3 text-[11px] text-[var(--accent)]">
                  Hold ~{p.tokensRequiredHolder?.toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
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

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="border border-[var(--border)] bg-[var(--bg-panel)] p-5">
            <h2 className="text-sm tracking-widest text-[var(--accent)]">
              HOLD {data.settings.tokenSymbol} TOKENS
            </h2>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Token amount auto-adjusts with market cap so USD cost stays ~flat.
              At $100M MC, holders pay fewer tokens for the same ${plan?.targetUsd} access.
            </p>
            <input
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="0x... your wallet holding CA tokens"
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
            <h2 className="text-sm tracking-widest text-[var(--accent)]">PAY WITH ETH</h2>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Send ETH to treasury, then paste tx hash. Crypto only — no cards.
            </p>
            {data.settings.treasuryAddress ? (
              <p className="mt-2 break-all font-mono text-[11px] text-[var(--warning)]">
                {data.settings.treasuryAddress}
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-[var(--danger)]">
                Treasury not set — admin must configure in /admin
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
          <h2 className="text-sm tracking-widest text-[var(--text-secondary)]">PRO INCLUDES</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {data.proBenefits.map((b) => (
              <li key={b}>→ {b}</li>
            ))}
          </ul>
        </section>

        {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-[var(--success)]">{message}</p> : null}
      </main>
    </div>
  );
}

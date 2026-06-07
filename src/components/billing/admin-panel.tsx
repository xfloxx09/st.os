"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PricingSettings } from "@/lib/billing/types";

export function AdminPanel() {
  const [settings, setSettings] = useState<PricingSettings | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/pricing")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setSettings(d as PricingSettings);
      });
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaved(false);
    const res = await fetch("/api/admin/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Save failed");
      return;
    }
    setError("");
    setSaved(true);
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-[var(--bg)] p-8 text-[var(--text-secondary)]">
        {error || "Loading admin..."}
      </div>
    );
  }

  const field = (
    label: string,
    key: keyof PricingSettings,
    type: "number" | "text" = "number"
  ) => (
    <label className="block text-xs">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <input
        type={type}
        value={String(settings[key] ?? "")}
        onChange={(e) =>
          setSettings({
            ...settings,
            [key]:
              type === "number" ? Number(e.target.value) : e.target.value,
          })
        }
        className="mt-1 w-full border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
      />
    </label>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border)] bg-[var(--bg-panel)] px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="tracking-[0.25em] text-[var(--accent)]">EXPOSED.OS ADMIN</span>
          <Link href="/" className="text-xs text-[var(--text-secondary)]">
            ← Terminal
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-6 py-8">
        <p className="text-sm text-[var(--text-secondary)]">
          Set target USD prices. Token amounts on /pricing auto-adjust from live MC/price.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {field("Weekly USD", "weeklyUsd")}
          {field("Monthly USD", "monthlyUsd")}
          {field("Yearly USD", "yearlyUsd")}
          {field("Holder discount %", "holderDiscountPercent")}
          {field("Token symbol", "tokenSymbol", "text")}
          {field("Token contract", "tokenContract", "text")}
          {field("Treasury address", "treasuryAddress", "text")}
        </div>

        <button
          type="button"
          onClick={() => void save()}
          className="border border-[var(--accent)] px-4 py-2 text-xs text-[var(--accent)]"
        >
          SAVE PRICING
        </button>

        {saved ? <p className="text-sm text-[var(--success)]">Saved.</p> : null}
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      </main>
    </div>
  );
}

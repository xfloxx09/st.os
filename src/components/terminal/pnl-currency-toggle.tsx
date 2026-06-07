"use client";

import type { PnlCurrency } from "@/stores/app-store";
import { useAppStore } from "@/stores/app-store";

export function PnlCurrencyToggle({ className = "" }: { className?: string }) {
  const pnlCurrency = useAppStore((s) => s.pnlCurrency);
  const setPnlCurrency = useAppStore((s) => s.setPnlCurrency);

  const btn = (currency: PnlCurrency, label: string) => (
    <button
      type="button"
      onClick={() => setPnlCurrency(currency)}
      className={`px-2 py-0.5 text-[9px] tracking-wider ${
        pnlCurrency === currency
          ? "bg-[var(--accent)]/20 text-[var(--accent)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className={`inline-flex border border-[var(--border)] ${className}`}>
      {btn("eth", "ETH")}
      {btn("usd", "$")}
    </div>
  );
}

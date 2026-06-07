"use client";

import type { WalletTrackSnapshot } from "@/lib/analyze/types";
import { formatUsd, truncateAddress } from "@/lib/ethereum";

const TIER_COLOR: Record<WalletTrackSnapshot["rating"]["tier"], string> = {
  ALPHA: "var(--success)",
  SOLID: "var(--accent)",
  NEUTRAL: "var(--text-secondary)",
  RISKY: "var(--warning)",
  TOXIC: "var(--danger)",
};

export function WalletTrackerPanel({ snapshot }: { snapshot: WalletTrackSnapshot }) {
  const tierColor = TIER_COLOR[snapshot.rating.tier];

  return (
    <div className="space-y-4 text-[11px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[var(--accent)]">
            {snapshot.trackLabel ?? truncateAddress(snapshot.walletAddress, 6)}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            LIVE TRACK · {snapshot.ethBalance != null ? `${snapshot.ethBalance.toFixed(3)} ETH` : "ETH n/a"}
          </div>
        </div>
        <div className="text-right">
          <div style={{ color: tierColor }} className="text-lg font-bold">
            {snapshot.rating.score}
          </div>
          <div className="text-[10px]" style={{ color: tierColor }}>
            {snapshot.rating.tier}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-[var(--text-secondary)]">{snapshot.rating.summary}</p>

      <section>
        <h3 className="mb-2 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          RATING FACTORS
        </h3>
        <div className="max-h-24 space-y-1 overflow-auto os-scrollbar">
          {snapshot.rating.factors.map((f) => (
            <div key={`${f.label}-${f.detail}`} className="flex justify-between gap-2">
              <span>{f.label}</span>
              <span className={f.impact >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                {f.impact > 0 ? "+" : ""}
                {f.impact}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          RECENT ACTIVITY
        </h3>
        <div className="max-h-28 space-y-1 overflow-auto os-scrollbar">
          {snapshot.trades.length === 0 ? (
            <p className="text-[var(--text-secondary)]">No recent token transfers for context CA.</p>
          ) : (
            snapshot.trades.slice(-10).map((trade) => (
              <div key={`${trade.txHash}-${trade.timestamp}`} className="flex justify-between gap-2">
                <span className={trade.type.includes("IN") ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                  {trade.type}
                </span>
                <span className="text-[var(--text-secondary)]">
                  {new Date(trade.timestamp).toLocaleDateString()}
                </span>
                <span>{trade.tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          CONNECTED WALLETS
        </h3>
        <div className="max-h-20 space-y-1 overflow-auto os-scrollbar">
          {snapshot.connectedWallets.length === 0 ? (
            <p className="text-[var(--text-secondary)]">No linked wallets surfaced yet.</p>
          ) : (
            snapshot.connectedWallets.map((w) => (
              <div key={w.address} className="flex justify-between gap-2">
                <span>{w.label ?? truncateAddress(w.address)}</span>
                <span className="text-[var(--text-secondary)]">{w.relation}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          PORTFOLIO BALANCE
        </h3>
        <div className="max-h-24 space-y-1 overflow-auto os-scrollbar">
          {snapshot.portfolio.length === 0 ? (
            <p className="text-[var(--text-secondary)]">Portfolio unavailable.</p>
          ) : (
            snapshot.portfolio.slice(0, 10).map((h) => (
              <div key={h.address} className="flex justify-between gap-2">
                <span>
                  {h.symbol} · {h.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className="text-[var(--text-secondary)]">{formatUsd(h.usdValue)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

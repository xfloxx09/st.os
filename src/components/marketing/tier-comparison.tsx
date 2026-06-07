const FREE_FEATURES = [
  { label: "Guest mode", detail: "5 contract analyses without account" },
  { label: "Telegram login", detail: "Unlimited CA scans on free tier" },
  { label: "Token overview", detail: "Price, liquidity, risk flags, deployer" },
  { label: "Holder roster", detail: "Via Blockscout (free data source)" },
  { label: "Search history", detail: "Recent contracts in sidebar" },
  { label: "OS windows", detail: "Draggable, tabbed, mergeable panels" },
];

const PRO_FEATURES = [
  { label: "Everything in Free", detail: "Plus full forensics stack" },
  { label: "Etherscan holders", detail: "Direct pipeline when server has Pro API" },
  { label: "Wallet analyze", detail: "Fund origin, trades, PNL, portfolio" },
  { label: "Live tracking", detail: "Alpha ratings + auto-refresh monitors" },
  { label: "Fund tracer", detail: "Shared funding paths across top holders" },
  { label: "Cross-analysis", detail: "Find insiders across 2–5 tokens" },
  { label: "Network map", detail: "FBI-style co-buy syndicate graph (30d/90d)" },
  { label: "Crypto billing", detail: "Pay ETH or hold EXPOSED tokens" },
];

export function TierComparison({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid gap-6 ${compact ? "md:grid-cols-2" : "md:grid-cols-2"}`}>
      <div className="border border-[var(--border)] bg-[var(--bg-panel)] p-6">
        <p className="text-[10px] tracking-[0.25em] text-[var(--text-secondary)]">
          FREE TIER
        </p>
        <h3 className="mt-2 text-xl text-[var(--text-primary)]">Recon</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Paste any contract. See who holds it. Enough to scout tokens before you
          commit.
        </p>
        <ul className="mt-5 space-y-3 text-sm">
          {FREE_FEATURES.map((f) => (
            <li key={f.label}>
              <span className="text-[var(--success)]">✓</span>{" "}
              <span className="text-[var(--text-primary)]">{f.label}</span>
              {!compact ? (
                <p className="ml-4 text-[11px] text-[var(--text-secondary)]">
                  {f.detail}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[11px] text-[var(--warning)]">
          Wallet deep-dive, tracking, and syndicate maps require Pro.
        </p>
      </div>

      <div className="border border-[var(--accent)] bg-[var(--bg-panel)] p-6 shadow-[0_0_24px_rgba(0,255,204,0.08)]">
        <p className="text-[10px] tracking-[0.25em] text-[var(--accent)]">
          PRO TIER
        </p>
        <h3 className="mt-2 text-xl text-[var(--accent)]">Full Exposure</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Target wallets. Map their friends. Trace who funded whom. See if they
          win or rug together.
        </p>
        <ul className="mt-5 space-y-3 text-sm">
          {PRO_FEATURES.map((f) => (
            <li key={f.label}>
              <span className="text-[var(--accent)]">→</span>{" "}
              <span className="text-[var(--text-primary)]">{f.label}</span>
              {!compact ? (
                <p className="ml-4 text-[11px] text-[var(--text-secondary)]">
                  {f.detail}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

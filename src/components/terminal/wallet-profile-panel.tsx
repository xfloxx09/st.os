"use client";

import type { WalletProfile } from "@/lib/analyze/types";
import { formatPercent, formatUsd, truncateAddress } from "@/lib/ethereum";

export function WalletProfilePanel({ profile }: { profile: WalletProfile }) {
  return (
    <div className="space-y-4 text-[11px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[var(--accent)]">
            {truncateAddress(profile.walletAddress, 6)}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            STALKING FOR {profile.contractAddress.slice(0, 10)}...
          </div>
        </div>
        <div className="text-right">
          <div className="text-[var(--warning)]">{profile.behaviorLabel}</div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {profile.behaviorConfidence} CONFIDENCE
          </div>
        </div>
      </div>

      {profile.cached ? (
        <p className="text-[10px] text-[var(--text-secondary)]">[CACHED RESPONSE]</p>
      ) : null}

      <section>
        <h3 className="mb-2 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          FUND ORIGIN
        </h3>
        <p className="text-[var(--text-primary)]">
          Funded from: {profile.fundOrigin.source}
        </p>
        {profile.fundOrigin.sourceAddress ? (
          <p className="text-[var(--text-secondary)]">
            {truncateAddress(profile.fundOrigin.sourceAddress)}
          </p>
        ) : null}
        <p className="text-[var(--text-secondary)]">
          Hops: {profile.fundOrigin.hops}
          {profile.fundOrigin.timestamp
            ? ` · ${new Date(profile.fundOrigin.timestamp).toLocaleDateString()}`
            : ""}
        </p>
        {profile.fundOrigin.flags.map((flag) => (
          <p key={flag} className="text-[var(--danger)]">
            ⚠ {flag}
          </p>
        ))}
      </section>

      <section>
        <h3 className="mb-2 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          TOKEN ACTIVITY
        </h3>
        <div className="max-h-28 overflow-auto os-scrollbar space-y-1">
          {profile.trades.length === 0 ? (
            <p className="text-[var(--text-secondary)]">No token transfers found.</p>
          ) : (
            profile.trades.slice(-12).map((trade) => (
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
          PNL ESTIMATE
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="STATUS" value={profile.pnl.status} />
          <Stat label="POSITION" value={profile.pnl.position.toLocaleString()} />
          <Stat label="ENTRY" value={formatUsd(profile.pnl.averageEntryUsd)} />
          <Stat label="CURRENT" value={formatUsd(profile.pnl.currentPriceUsd)} />
          <Stat
            label="UNREALIZED"
            value={formatUsd(profile.pnl.unrealizedPnlUsd)}
            extra={formatPercent(profile.pnl.unrealizedPnlPercent)}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          PORTFOLIO (TOP HOLDINGS)
        </h3>
        <div className="max-h-24 overflow-auto os-scrollbar space-y-1">
          {profile.portfolio.length === 0 ? (
            <p className="text-[var(--text-secondary)]">
              Portfolio unavailable (add ALCHEMY_API_KEY for balances).
            </p>
          ) : (
            profile.portfolio.slice(0, 8).map((h) => (
              <div key={h.address} className="flex justify-between gap-2">
                <span>{h.symbol}</span>
                <span className="text-[var(--text-secondary)]">{formatUsd(h.usdValue)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  extra,
}: {
  label: string;
  value: string;
  extra?: string;
}) {
  return (
    <div>
      <div className="text-[10px] text-[var(--text-secondary)]">{label}</div>
      <div className="text-[var(--text-primary)]">
        {value}
        {extra ? <span className="ml-1 text-[var(--text-secondary)]">{extra}</span> : null}
      </div>
    </div>
  );
}

"use client";

import type { TokenOverview } from "@/lib/analyze/types";
import {
  formatPercent,
  formatUsd,
  truncateAddress,
} from "@/lib/ethereum";

function flagColor(level: string) {
  if (level === "danger") return "text-[var(--danger)] border-[var(--danger)]";
  if (level === "warning") return "text-[var(--warning)] border-[var(--warning)]";
  return "text-[var(--accent)] border-[var(--border)]";
}

export function TokenOverviewPanel({
  overview,
  cached,
}: {
  overview: TokenOverview;
  cached?: boolean;
}) {
  return (
    <div className="space-y-4 text-[11px]">
      <div>
        <div className="text-base text-[var(--text-primary)]">
          {overview.symbol}{" "}
          <span className="text-[var(--text-secondary)]">{overview.name}</span>
        </div>
        <div className="mt-1 font-mono text-[var(--accent)]">
          {truncateAddress(overview.address, 6)}
        </div>
        {cached ? (
          <div className="mt-1 text-[10px] text-[var(--text-secondary)]">
            [CACHED RESPONSE]
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="PRICE" value={formatUsd(overview.priceUsd)} />
        <Stat
          label="24H"
          value={formatPercent(overview.priceChange24h)}
          highlight={
            overview.priceChange24h != null
              ? overview.priceChange24h >= 0
                ? "success"
                : "danger"
              : undefined
          }
        />
        <Stat label="MCAP" value={formatUsd(overview.marketCap)} />
        <Stat label="LIQUIDITY" value={formatUsd(overview.liquidityUsd)} />
        <Stat label="VOLUME 24H" value={formatUsd(overview.volume24h)} />
        <Stat label="SUPPLY" value={overview.totalSupply} />
      </div>

      <div className="space-y-1 border-t border-[var(--border)] pt-3">
        <Row
          label="DEPLOYER"
          value={
            overview.deployer
              ? truncateAddress(overview.deployer)
              : "UNKNOWN"
          }
        />
        <Row
          label="VERIFIED"
          value={overview.verified ? "YES" : "NO"}
          highlight={overview.verified ? "success" : "warning"}
        />
        {overview.topPoolAddress ? (
          <Row
            label="TOP POOL"
            value={`${overview.topPoolDex ?? "DEX"} · ${truncateAddress(overview.topPoolAddress)}`}
          />
        ) : null}
      </div>

      <div>
        <div className="mb-2 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          RISK FLAGS
        </div>
        {overview.riskFlags.length === 0 ? (
          <p className="text-[var(--success)]">No critical flags detected.</p>
        ) : (
          <ul className="space-y-1">
            {overview.riskFlags.map((flag) => (
              <li
                key={flag.code}
                className={`border px-2 py-1 ${flagColor(flag.level)}`}
              >
                {flag.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "success" | "danger" | "warning";
}) {
  const color =
    highlight === "success"
      ? "text-[var(--success)]"
      : highlight === "danger"
        ? "text-[var(--danger)]"
        : highlight === "warning"
          ? "text-[var(--warning)]"
          : "text-[var(--text-primary)]";

  return (
    <div>
      <div className="text-[10px] text-[var(--text-secondary)]">{label}</div>
      <div className={color}>{value}</div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "success" | "warning";
}) {
  const color =
    highlight === "success"
      ? "text-[var(--success)]"
      : highlight === "warning"
        ? "text-[var(--warning)]"
        : "text-[var(--text-primary)]";

  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className={color}>{value}</span>
    </div>
  );
}

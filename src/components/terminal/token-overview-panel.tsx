"use client";

import { useState } from "react";
import type { TokenOverview } from "@/lib/analyze/types";
import {
  formatPercent,
  formatUsd,
  truncateAddress,
} from "@/lib/ethereum";
import { fetchFundTrace, fetchWalletAnalyze } from "@/lib/terminal/phase-actions";
import { elapsedMs, startTimer } from "@/lib/timing";
import { useAppStore, walletProfileKey } from "@/stores/app-store";

function flagColor(level: string) {
  if (level === "danger") return "text-[var(--danger)] border-[var(--danger)]";
  if (level === "warning") return "text-[var(--warning)] border-[var(--warning)]";
  return "text-[var(--accent)] border-[var(--border)]";
}

export function TokenOverviewPanel({
  overview,
  cached,
  contractAddress,
}: {
  overview: TokenOverview;
  cached?: boolean;
  contractAddress?: string;
}) {
  const [tracing, setTracing] = useState(false);
  const [analyzingDeployer, setAnalyzingDeployer] = useState(false);
  const user = useAppStore((s) => s.user);
  const openFundTracerPanel = useAppStore((s) => s.openFundTracerPanel);
  const openWalletPanel = useAppStore((s) => s.openWalletPanel);
  const setWalletProfile = useAppStore((s) => s.setWalletProfile);
  const setFundTrace = useAppStore((s) => s.setFundTrace);
  const toggleCrossCompare = useAppStore((s) => s.toggleCrossCompare);
  const crossCompareSelection = useAppStore((s) => s.crossCompareSelection);
  const setAnalyzeError = useAppStore((s) => s.setAnalyzeError);
  const setActiveProcesses = useAppStore((s) => s.setActiveProcesses);
  const ca = contractAddress ?? overview.address;

  const onTraceFunds = async () => {
    if (!user) {
      setAnalyzeError("Connect Telegram for fund tracing.");
      return;
    }
    setTracing(true);
    setAnalyzeError(null);
    setActiveProcesses(useAppStore.getState().activeProcesses + 1);
    const start = startTimer();
    try {
      const result = await fetchFundTrace(ca);
      setFundTrace(ca, result);
      openFundTracerPanel(ca);
      useAppStore.getState().setLastQueryMs(elapsedMs(start));
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Fund trace failed");
    } finally {
      setTracing(false);
      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));
    }
  };

  const inCross = crossCompareSelection.map((c) => c.toLowerCase()).includes(ca.toLowerCase());

  const onAnalyzeDeployer = async () => {
    if (!overview.deployer || !user) {
      setAnalyzeError("Deployer unknown or login required.");
      return;
    }
    setAnalyzingDeployer(true);
    setAnalyzeError(null);
    setActiveProcesses(useAppStore.getState().activeProcesses + 1);
    const start = startTimer();
    try {
      const profile = await fetchWalletAnalyze(overview.deployer, ca);
      setWalletProfile(walletProfileKey(overview.deployer, ca), profile);
      openWalletPanel(overview.deployer, ca, { label: "DEPLOYER" });
      useAppStore.getState().setLastQueryMs(elapsedMs(start));
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Deployer analyze failed");
    } finally {
      setAnalyzingDeployer(false);
      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));
    }
  };

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

      {user ? (
        <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
          <button
            type="button"
            onClick={() => void onTraceFunds()}
            disabled={tracing}
            className="border border-[var(--warning)] px-2 py-1 text-[10px] text-[var(--warning)] hover:bg-[var(--warning)] hover:text-[var(--bg)] disabled:opacity-40"
          >
            {tracing ? "TRACING..." : "TRACE FUNDS"}
          </button>
          <button
            type="button"
            onClick={() => toggleCrossCompare(ca)}
            className={`border px-2 py-1 text-[10px] ${
              inCross
                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                : "border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]"
            }`}
          >
            {inCross ? "IN CROSS SET" : "ADD TO CROSS"}
          </button>
        </div>
      ) : null}

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
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--text-secondary)]">DEPLOYER</span>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-primary)]">
              {overview.deployer
                ? truncateAddress(overview.deployer)
                : "UNKNOWN"}
            </span>
            {user && overview.deployer ? (
              <button
                type="button"
                onClick={() => void onAnalyzeDeployer()}
                disabled={analyzingDeployer}
                className="border border-[var(--accent)] px-1.5 py-0.5 text-[9px] text-[var(--accent)] disabled:opacity-40"
              >
                {analyzingDeployer ? "..." : "ANALYZE"}
              </button>
            ) : null}
          </div>
        </div>
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

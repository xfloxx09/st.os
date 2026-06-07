"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ExposedWallet, HolderEntry, TraderEntry } from "@/lib/analyze/types";
import { formatPnlValue, formatUsd, truncateAddress } from "@/lib/ethereum";
import { PnlCurrencyToggle } from "@/components/terminal/pnl-currency-toggle";
import { elapsedMs, startTimer } from "@/lib/timing";
import {
  fetchBulkExpose,
  fetchExposeScan,
  fetchFundTrace,
} from "@/lib/terminal/phase-actions";
import { networkResultKey, useAppStore } from "@/stores/app-store";

type Tab = "holders" | "traders" | "exposed";

function formatPercent(value: number): string {
  if (value >= 0.01) return `${value.toFixed(2)}%`;
  if (value > 0) return `${value.toFixed(4)}%`;
  return "0.00%";
}

const TIER_COLOR: Record<ExposedWallet["tier"], string> = {
  CRITICAL: "var(--danger)",
  HIGH: "var(--warning)",
  MEDIUM: "var(--accent)",
  LOW: "var(--text-secondary)",
};

function walletDisplayName(
  address: string,
  label: string | null,
  aliases: Record<string, string>
): string {
  return (
    aliases[address.toLowerCase()] ??
    label ??
    truncateAddress(address)
  );
}

export function HolderRosterPanel({
  holders,
  allHolders,
  contractAddress,
  holdersMeta,
}: {
  holders: HolderEntry[];
  allHolders: HolderEntry[];
  contractAddress: string;
  holdersMeta?: {
    source: string;
    totalRaw: number;
    analyzable: number;
    filtered: number;
    warning?: string;
    proRequired?: boolean;
    capped?: boolean;
    maxFetched?: number;
  };
}) {
  const [tab, setTab] = useState<Tab>("holders");
  const [tracingFunds, setTracingFunds] = useState(false);
  const [exposingAll, setExposingAll] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [exposeScanError, setExposeScanError] = useState<string | null>(null);
  const [showFiltered, setShowFiltered] = useState(false);

  const user = useAppStore((s) => s.user);
  const walletAliases = useAppStore((s) => s.walletAliases);
  const exposeScan = useAppStore((s) => s.exposeScanResults[contractAddress]);
  const setExposeScan = useAppStore((s) => s.setExposeScan);
  const setBulkExpose = useAppStore((s) => s.setBulkExpose);
  const openWalletPanel = useAppStore((s) => s.openWalletPanel);
  const openExposeReportPanel = useAppStore((s) => s.openExposeReportPanel);
  const setNetworkResult = useAppStore((s) => s.setNetworkResult);
  const setActiveProcesses = useAppStore((s) => s.setActiveProcesses);
  const setAnalyzeError = useAppStore((s) => s.setAnalyzeError);
  const openFundTracerPanel = useAppStore((s) => s.openFundTracerPanel);
  const setFundTrace = useAppStore((s) => s.setFundTrace);
  const toggleCrossCompare = useAppStore((s) => s.toggleCrossCompare);
  const crossCompareSelection = useAppStore((s) => s.crossCompareSelection);
  const pnlCurrency = useAppStore((s) => s.pnlCurrency);
  const ethPriceUsd = useAppStore((s) => s.ethPriceUsd);

  const excludedCount = allHolders.length - holders.length;
  const filteredHolders = allHolders.filter((h) => h.excluded);
  const canAct = Boolean(user);
  const isPro = Boolean(user?.isPro || user?.isAdmin);
  const inCross = crossCompareSelection
    .map((c) => c.toLowerCase())
    .includes(contractAddress.toLowerCase());

  const exposedWallets = exposeScan?.exposedWallets ?? [];
  const traders = exposeScan?.traders ?? [];

  const openWallet = (
    address: string,
    opts?: { rank?: number; percent?: number; label?: string | null }
  ) => {
    openWalletPanel(address, contractAddress, {
      rank: opts?.rank,
      percent: opts?.percent,
      label: walletDisplayName(address, opts?.label ?? null, walletAliases),
    });
  };

  const runExposeScan = async (force = false) => {
    if (exposeScan && !force) return;
    setScanLoading(true);
    setExposeScanError(null);
    setActiveProcesses(useAppStore.getState().activeProcesses + 1);
    try {
      const result = await fetchExposeScan(contractAddress, {
        full: isPro,
        refresh: force,
      });
      setExposeScan(contractAddress, result);
    } catch (err) {
      setExposeScanError(
        err instanceof Error ? err.message : "Expose scan failed"
      );
    } finally {
      setScanLoading(false);
      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));
    }
  };

  useEffect(() => {
    void runExposeScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractAddress]);

  const onTraceFunds = async () => {
    if (!canAct) {
      setAnalyzeError("Connect Telegram for fund tracing.");
      return;
    }
    setTracingFunds(true);
    setActiveProcesses(useAppStore.getState().activeProcesses + 1);
    const start = startTimer();
    try {
      const result = await fetchFundTrace(contractAddress);
      setFundTrace(contractAddress, result);
      openFundTracerPanel(contractAddress);
      useAppStore.getState().setLastQueryMs(elapsedMs(start));
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Fund trace failed");
    } finally {
      setTracingFunds(false);
      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));
    }
  };

  const onExposeAll = async () => {
    if (!canAct || !isPro) {
      setAnalyzeError("EXPOSED.OS Pro required for bulk expose.");
      return;
    }
    setExposingAll(true);
    setActiveProcesses(useAppStore.getState().activeProcesses + 1);
    const start = startTimer();
    try {
      const result = await fetchBulkExpose(contractAddress, 90);
      setBulkExpose(contractAddress, result);
      if (result.primaryNetwork) {
        setNetworkResult(
          networkResultKey(result.primaryNetwork.seedWallet, 90),
          result.primaryNetwork
        );
      }
      openExposeReportPanel(contractAddress);
      useAppStore.getState().setLastQueryMs(elapsedMs(start));
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Bulk expose failed");
    } finally {
      setExposingAll(false);
      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));
    }
  };

  const tabBtn = (id: Tab, label: string, count?: number) => {
    const isExposed = id === "exposed";
    const active = tab === id;
    return (
      <button
        type="button"
        onClick={() => setTab(id)}
        className={`border px-2 py-1 text-[10px] tracking-wide ${
          isExposed
            ? active
              ? "border-[var(--warning)] bg-[var(--warning)] text-[var(--bg)] shadow-[0_0_14px_rgba(255,184,0,0.4)]"
              : "border-[var(--warning)]/70 bg-[var(--warning)]/10 text-[var(--warning)]"
            : active
              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
              : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
        }`}
      >
        {isExposed ? "★ " : ""}
        {label}
        {count != null ? ` (${count})` : ""}
      </button>
    );
  };

  const clickHint = (
    <p className="text-[9px] text-[var(--text-secondary)]">
      Click any wallet to open intel window
    </p>
  );

  return (
    <div className="space-y-3 text-[11px]">
      {holdersMeta?.proRequired ? (
        <div className="border border-[var(--warning)] bg-[var(--bg)] p-3 text-[10px]">
          <p className="text-[var(--warning)]">
            FREE TIER: Blockscout holders. Upgrade for Etherscan pipeline + wallet intel.
          </p>
          <Link href="/pricing" className="mt-2 inline-block text-[var(--accent)] underline">
            Upgrade to EXPOSED.OS Pro →
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {tabBtn("holders", "HOLDERS", holders.length)}
          {tabBtn("traders", "TOP PNL", traders.length)}
          {tabBtn("exposed", "EXPOSED", exposedWallets.length)}
        </div>
        {canAct && isPro ? (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => void onExposeAll()}
              disabled={exposingAll || exposedWallets.length === 0}
              className="border border-[var(--danger)] px-2 py-0.5 text-[10px] text-[var(--danger)] disabled:opacity-40"
            >
              {exposingAll ? "..." : "EXPOSE ALL"}
            </button>
            <button
              type="button"
              onClick={() => void onTraceFunds()}
              disabled={tracingFunds}
              className="border border-[var(--warning)] px-2 py-0.5 text-[10px] text-[var(--warning)] disabled:opacity-40"
            >
              TRACE
            </button>
            <button
              type="button"
              onClick={() => toggleCrossCompare(contractAddress)}
              className={`border px-2 py-0.5 text-[10px] ${
                inCross
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                  : "border-[var(--accent)] text-[var(--accent)]"
              }`}
            >
              {inCross ? "IN CROSS" : "CROSS"}
            </button>
          </div>
        ) : null}
      </div>

      {tab === "holders" ? (
        <>
          <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--text-secondary)]">
            <span>
              {holders.length} holders
              {holdersMeta?.capped
                ? ` (top ${holdersMeta.maxFetched ?? holders.length})`
                : ""}
              {excludedCount > 0 ? ` · ${excludedCount} filtered` : ""}
              {holdersMeta ? ` · ${holdersMeta.source}` : ""}
            </span>
            {clickHint}
          </div>
          <div className="max-h-[340px] overflow-auto os-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-[var(--bg-panel)] text-[10px] text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">WALLET</th>
                  <th className="py-1 pr-2 text-right">%</th>
                  <th className="py-1 text-right">USD</th>
                </tr>
              </thead>
              <tbody>
                {holders.map((holder) => {
                  const isExposed = exposedWallets.some(
                    (e) => e.address.toLowerCase() === holder.address.toLowerCase()
                  );
                  return (
                    <tr
                      key={holder.address}
                      onClick={() =>
                        openWallet(holder.address, {
                          rank: holder.rank,
                          percent: holder.percentOfSupply,
                          label: holder.label,
                        })
                      }
                      className={`cursor-pointer border-b border-[var(--border)]/50 hover:bg-[var(--accent)]/10 ${
                        isExposed ? "bg-[var(--warning)]/5" : ""
                      }`}
                    >
                      <td className="py-1.5 pr-2 text-[var(--text-secondary)]">
                        {holder.rank}
                      </td>
                      <td className="py-1.5 pr-2 text-[var(--accent)]">
                        {walletDisplayName(holder.address, holder.label, walletAliases)}
                      </td>
                      <td className="py-1.5 pr-2 text-right">
                        {formatPercent(holder.percentOfSupply)}
                      </td>
                      <td className="py-1.5 text-right text-[var(--text-secondary)]">
                        {formatUsd(holder.usdValue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {tab === "traders" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--text-secondary)]">
            <div className="space-y-0.5">
              <span>Top PnL on this token</span>
              <p className="text-[9px] text-[var(--text-secondary)]/80">
                Profit/loss vs cost basis (realized + unrealized) ·{" "}
                {pnlCurrency === "eth" ? "ETH" : "USD"} at current token price
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PnlCurrencyToggle />
              {clickHint}
            </div>
          </div>
          <div className="max-h-[340px] overflow-auto os-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-[var(--bg-panel)] text-[10px] text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">WALLET</th>
                  <th className="py-1 pr-2 text-right">
                    PNL ({pnlCurrency === "eth" ? "Ξ" : "$"})
                  </th>
                  <th className="py-1 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {traders.map((trader: TraderEntry) => (
                  <tr
                    key={trader.address}
                    onClick={() =>
                      openWallet(trader.address, { label: trader.label })
                    }
                    className="cursor-pointer border-b border-[var(--border)]/50 hover:bg-[var(--accent)]/10"
                  >
                    <td className="py-1.5 pr-2 text-[var(--text-secondary)]">
                      {trader.rank}
                    </td>
                    <td className="py-1.5 pr-2 text-[var(--accent)]">
                      {walletDisplayName(trader.address, trader.label, walletAliases)}
                    </td>
                    <td
                      className={`py-1.5 pr-2 text-right ${
                        (trader.totalPnlUsd ?? 0) >= 0
                          ? "text-[var(--success)]"
                          : "text-[var(--danger)]"
                      }`}
                    >
                      {formatPnlValue(trader.totalPnlUsd, pnlCurrency, ethPriceUsd)}
                    </td>
                    <td className="py-1.5 text-right text-[9px] text-[var(--text-secondary)]">
                      {trader.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {tab === "exposed" ? (
        <>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {scanLoading
              ? "Scanning for exposed wallets..."
              : exposeScanError ?? exposeScan?.summary ?? ""}
          </div>
          {clickHint}
          <div className="max-h-[340px] overflow-auto os-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-[var(--bg-panel)] text-[10px] text-[var(--text-secondary)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">WALLET</th>
                  <th className="py-1 pr-2 text-right">SCORE</th>
                  <th className="py-1">SIGNALS</th>
                </tr>
              </thead>
              <tbody>
                {exposedWallets.map((exposed, index) => (
                  <tr
                    key={exposed.address}
                    onClick={() =>
                      openWallet(exposed.address, {
                        rank: exposed.holderRank ?? undefined,
                        percent: exposed.percentOfSupply ?? undefined,
                        label: exposed.label,
                      })
                    }
                    className="cursor-pointer border-b border-[var(--border)]/50 hover:bg-[var(--warning)]/10"
                  >
                    <td className="py-1.5 pr-2 text-[var(--text-secondary)]">
                      {index + 1}
                    </td>
                    <td className="py-1.5 pr-2 text-[var(--warning)]">
                      {walletDisplayName(exposed.address, exposed.label, walletAliases)}
                    </td>
                    <td className="py-1.5 pr-2 text-right">
                      <span style={{ color: TIER_COLOR[exposed.tier] }}>
                        {exposed.exposeScore}
                      </span>
                    </td>
                    <td className="py-1.5 text-[9px] text-[var(--text-secondary)]">
                      {exposed.reasons.slice(0, 2).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {filteredHolders.length > 0 ? (
        <div className="border-t border-[var(--border)] pt-2">
          <button
            type="button"
            onClick={() => setShowFiltered((v) => !v)}
            className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent)]"
          >
            {showFiltered ? "▼" : "▶"} FILTERED ({filteredHolders.length})
          </button>
          {showFiltered ? (
            <div className="mt-2 max-h-24 overflow-auto os-scrollbar text-[10px]">
              {filteredHolders.map((holder) => (
                <div
                  key={holder.address}
                  className="border-b border-[var(--border)]/30 py-1 text-[var(--text-secondary)]"
                >
                  #{holder.rank}{" "}
                  {walletDisplayName(holder.address, holder.label, walletAliases)} ·{" "}
                  {formatPercent(holder.percentOfSupply)}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

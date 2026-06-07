"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ProTrackWallet } from "@/lib/analyze/types";
import { formatPnlValue, truncateAddress } from "@/lib/ethereum";
import { PnlCurrencyToggle } from "@/components/terminal/pnl-currency-toggle";
import { TokenTradeChart } from "@/components/terminal/token-trade-chart";
import { fetchProAlphaScan } from "@/lib/terminal/phase-actions";
import { useAppStore } from "@/stores/app-store";

const STRATEGY_COLOR: Record<string, string> = {
  "ALPHA LEADER": "var(--warning)",
  ALPHA: "var(--warning)",
  "EARLY BUYER": "var(--accent)",
  "FOLLOWS ALPHA": "var(--text-secondary)",
  SNIPER: "var(--success)",
  "SWING TRADER": "var(--accent)",
  "DIAMOND HANDS": "var(--success)",
  "WHALE STACKER": "var(--danger)",
  "SERIAL DEGEN": "var(--text-secondary)",
};

function walletDisplayName(
  address: string,
  label: string | null,
  aliases: Record<string, string>
): string {
  return aliases[address.toLowerCase()] ?? label ?? truncateAddress(address, 6);
}

function pnlCell(
  snap: { totalPnlUsd: number | null },
  currency: "eth" | "usd",
  ethPrice: number | null
): string {
  const v = snap.totalPnlUsd;
  if (v == null) return "--";
  const formatted = formatPnlValue(v, currency, ethPrice);
  return formatted;
}

export function ProTrackPanel({
  contractAddress,
  isPro,
}: {
  contractAddress: string;
  isPro: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const scan = useAppStore((s) => s.proAlphaResults[contractAddress]);
  const setProAlphaScan = useAppStore((s) => s.setProAlphaScan);
  const setActiveProcesses = useAppStore((s) => s.setActiveProcesses);
  const openWalletPanel = useAppStore((s) => s.openWalletPanel);
  const walletAliases = useAppStore((s) => s.walletAliases);
  const pnlCurrency = useAppStore((s) => s.pnlCurrency);
  const ethPriceUsd = useAppStore((s) => s.ethPriceUsd);

  const runScan = async (force = false) => {
    if (!isPro) return;
    if (scan && !force) return;
    setLoading(true);
    setError(null);
    setActiveProcesses(useAppStore.getState().activeProcesses + 1);
    try {
      const result = await fetchProAlphaScan(contractAddress, { refresh: force });
      setProAlphaScan(contractAddress, result);
      if (result.trackWallets[0] && !selected) {
        setSelected(result.trackWallets[0].address);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pro scan failed");
    } finally {
      setLoading(false);
      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));
    }
  };

  useEffect(() => {
    if (isPro) void runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractAddress, isPro]);

  if (!isPro) {
    return (
      <div className="border border-[var(--warning)]/60 bg-[var(--warning)]/5 p-4 text-[10px]">
        <p className="text-[var(--warning)]">★ PRO TRACK — golden feature</p>
        <p className="mt-2 text-[var(--text-secondary)]">
          Rank wallets to track by PnL (day/week/month), intel score, early-buy
          patterns, and strategy labels. Includes price chart with exact buy/sell
          markers.
        </p>
        <Link href="/pricing" className="mt-3 inline-block text-[var(--accent)] underline">
          Upgrade to EXPOSED.OS Pro →
        </Link>
      </div>
    );
  }

  const wallets = scan?.trackWallets ?? [];
  const selectedWallet = wallets.find(
    (w) => w.address.toLowerCase() === selected?.toLowerCase()
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border border-[var(--warning)]/50 bg-[var(--warning)]/5 px-2 py-2">
        <div>
          <div className="text-[10px] tracking-widest text-[var(--warning)]">
            ★ PRO TRACK — WALLETS TO WATCH
          </div>
          <p className="text-[9px] text-[var(--text-secondary)]">
            {scan?.summary ?? (loading ? "Running alpha intel scan..." : "")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PnlCurrencyToggle />
          <button
            type="button"
            onClick={() => void runScan(true)}
            disabled={loading}
            className="border border-[var(--border)] px-2 py-1 text-[9px] text-[var(--text-secondary)]"
          >
            {loading ? "..." : "REFRESH"}
          </button>
        </div>
      </div>

      {error ? <p className="text-[10px] text-[var(--danger)]">{error}</p> : null}

      {scan ? (
        <TokenTradeChart
          points={scan.chartPoints}
          markers={selectedWallet?.markers ?? []}
          selectedWallet={selectedWallet?.address}
        />
      ) : null}

      {selectedWallet ? (
        <div className="border border-[var(--border)] bg-[var(--bg)] p-2 text-[10px]">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="text-[var(--accent)]">
              {walletDisplayName(
                selectedWallet.address,
                selectedWallet.label,
                walletAliases
              )}
            </span>
            <span
              style={{ color: STRATEGY_COLOR[selectedWallet.strategy] ?? "var(--text-primary)" }}
            >
              {selectedWallet.strategy}
            </span>
          </div>
          <p className="mt-1 text-[9px] text-[var(--text-secondary)]">
            {selectedWallet.strategyDetail} · {selectedWallet.preferredWindow}
          </p>
          <p className="mt-1 text-[9px] text-[var(--text-secondary)]">
            Intel {selectedWallet.intelScore} · Track score {selectedWallet.trackScore}
            {selectedWallet.followers48h > 0
              ? ` · ${selectedWallet.followers48h} followers (48h)`
              : ""}
          </p>
          {selectedWallet.trackReasons.length > 0 ? (
            <ul className="mt-1 list-inside list-disc text-[9px] text-[var(--text-secondary)]">
              {selectedWallet.trackReasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={() =>
              openWalletPanel(selectedWallet.address, contractAddress, {
                rank: selectedWallet.holderRank ?? selectedWallet.rank,
                percent: selectedWallet.percentOfSupply ?? undefined,
                label: walletDisplayName(
                  selectedWallet.address,
                  selectedWallet.label,
                  walletAliases
                ),
              })
            }
            className="mt-2 border border-[var(--accent)] px-2 py-1 text-[9px] text-[var(--accent)]"
          >
            OPEN WALLET INTEL →
          </button>
        </div>
      ) : null}

      <div className="max-h-[280px] overflow-auto os-scrollbar">
        <table className="w-full text-left text-[10px]">
          <thead className="sticky top-0 bg-[var(--bg-panel)] text-[9px] text-[var(--text-secondary)]">
            <tr className="border-b border-[var(--border)]">
              <th className="py-1 pr-2">#</th>
              <th className="py-1 pr-2">WALLET</th>
              <th className="py-1 pr-2">STRATEGY</th>
              <th className="py-1 pr-2 text-right">INTEL</th>
              <th className="py-1 pr-2 text-right">1D</th>
              <th className="py-1 pr-2 text-right">7D</th>
              <th className="py-1 pr-2 text-right">30D</th>
              <th className="py-1 text-right">TRACK</th>
            </tr>
          </thead>
          <tbody>
            {wallets.map((w: ProTrackWallet) => {
              const active =
                selected?.toLowerCase() === w.address.toLowerCase();
              return (
                <tr
                  key={w.address}
                  onClick={() => setSelected(w.address)}
                  className={`cursor-pointer border-b border-[var(--border)]/40 ${
                    active ? "bg-[var(--warning)]/10" : "hover:bg-[var(--accent)]/10"
                  }`}
                >
                  <td className="py-1.5 pr-2 text-[var(--text-secondary)]">{w.rank}</td>
                  <td className="py-1.5 pr-2 text-[var(--accent)]">
                    {walletDisplayName(w.address, w.label, walletAliases)}
                  </td>
                  <td
                    className="py-1.5 pr-2 text-[9px]"
                    style={{
                      color: STRATEGY_COLOR[w.strategy] ?? "var(--text-primary)",
                    }}
                  >
                    {w.strategy}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-[var(--warning)]">
                    {w.intelScore}
                  </td>
                  <td
                    className={`py-1.5 pr-2 text-right ${
                      (w.pnlDay.totalPnlUsd ?? 0) >= 0
                        ? "text-[var(--success)]"
                        : "text-[var(--danger)]"
                    }`}
                  >
                    {pnlCell(w.pnlDay, pnlCurrency, ethPriceUsd)}
                  </td>
                  <td
                    className={`py-1.5 pr-2 text-right ${
                      (w.pnlWeek.totalPnlUsd ?? 0) >= 0
                        ? "text-[var(--success)]"
                        : "text-[var(--danger)]"
                    }`}
                  >
                    {pnlCell(w.pnlWeek, pnlCurrency, ethPriceUsd)}
                  </td>
                  <td
                    className={`py-1.5 pr-2 text-right ${
                      (w.pnlMonth.totalPnlUsd ?? 0) >= 0
                        ? "text-[var(--success)]"
                        : "text-[var(--danger)]"
                    }`}
                  >
                    {pnlCell(w.pnlMonth, pnlCurrency, ethPriceUsd)}
                  </td>
                  <td className="py-1.5 text-right font-medium text-[var(--warning)]">
                    {w.trackScore}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loading && wallets.length === 0 ? (
        <p className="scan-line text-[10px] text-[var(--warning)]">
          SCANNING ALPHA TARGETS · PNL WINDOWS · FIRST-MOVER INTEL...
        </p>
      ) : null}
    </div>
  );
}

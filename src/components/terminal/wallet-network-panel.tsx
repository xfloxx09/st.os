"use client";

import { useMemo, useState } from "react";
import type { NetworkWindow } from "@/lib/analyze/wallet-network";
import type {
  NetworkFriend,
  WalletNetworkResult,
} from "@/lib/analyze/types";
import { truncateAddress } from "@/lib/ethereum";
import { fetchWalletNetwork } from "@/lib/terminal/phase-actions";
import { elapsedMs, startTimer } from "@/lib/timing";
import { networkResultKey, useAppStore } from "@/stores/app-store";
import { NetworkGraph } from "@/components/terminal/network-graph";

type ViewTab = "tokens" | "wallets" | "map";

const RELATION_LABEL: Record<string, string> = {
  SAME_DAY_BUY: "Same day",
  SHARED_FUND_SOURCE: "Same funder",
  CO_BOUGHT: "Co-bought",
};

function walletName(
  address: string,
  label: string | null,
  aliases: Record<string, string>
): string {
  return aliases[address.toLowerCase()] ?? label ?? truncateAddress(address, 6);
}

function timingLabel(daysApart: number): string {
  if (daysApart <= 1) return "SAME DAY";
  if (daysApart <= 7) return `${daysApart}d apart`;
  return `${daysApart}d apart`;
}

function timingClass(daysApart: number): string {
  if (daysApart <= 1) return "text-[var(--danger)] border-[var(--danger)]/40 bg-[var(--danger)]/10";
  if (daysApart <= 7) return "text-[var(--warning)] border-[var(--warning)]/40 bg-[var(--warning)]/10";
  return "text-[var(--text-secondary)] border-[var(--border)]";
}

function formatBuyDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function bondTier(score: number): { label: string; className: string } {
  if (score >= 70) return { label: "Strong", className: "text-[var(--danger)]" };
  if (score >= 45) return { label: "Moderate", className: "text-[var(--warning)]" };
  return { label: "Weak", className: "text-[var(--text-secondary)]" };
}

export function WalletNetworkPanel({
  result: initial,
  walletAddress,
  contractAddress,
}: {
  result: WalletNetworkResult;
  walletAddress: string;
  contractAddress?: string;
}) {
  const [result, setResult] = useState(initial);
  const [windowDays, setWindowDays] = useState<NetworkWindow>(
    initial.windowDays as NetworkWindow
  );
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<ViewTab>("tokens");

  const setNetworkResult = useAppStore((s) => s.setNetworkResult);
  const setAnalyzeError = useAppStore((s) => s.setAnalyzeError);
  const openWalletPanel = useAppStore((s) => s.openWalletPanel);
  const walletAliases = useAppStore((s) => s.walletAliases);

  const sameDayCount = result.friends.filter((f) =>
    f.relationTypes.includes("SAME_DAY_BUY")
  ).length;
  const sharedFunderCount = result.friends.filter((f) =>
    f.relationTypes.includes("SHARED_FUND_SOURCE")
  ).length;

  const tokenCards = useMemo(() => {
    const ctx = result.contextContract?.toLowerCase();
    return [...result.commonTokenClusters]
      .sort((a, b) => {
        if (ctx) {
          const aCtx = a.contractAddress.toLowerCase() === ctx ? 1 : 0;
          const bCtx = b.contractAddress.toLowerCase() === ctx ? 1 : 0;
          if (aCtx !== bCtx) return bCtx - aCtx;
        }
        return b.friendCount - a.friendCount;
      })
      .map((cluster) => {
        const linked = result.friends
          .map((friend) => {
            const match = friend.commonTokens.find(
              (t) => t.contractAddress === cluster.contractAddress
            );
            if (!match) return null;
            return { friend, match };
          })
          .filter((row): row is { friend: NetworkFriend; match: NetworkFriend["commonTokens"][0] } =>
            Boolean(row)
          )
          .sort((a, b) => a.match.daysApart - b.match.daysApart);

        const seedBoughtAt = linked[0]?.match.seedBoughtAt ?? null;
        const sameDay = linked.filter((l) => l.match.daysApart <= 1).length;

        return { cluster, linked, seedBoughtAt, sameDay };
      });
  }, [result]);

  const rerun = async (days: NetworkWindow) => {
    setLoading(true);
    setWindowDays(days);
    setAnalyzeError(null);
    const start = startTimer();
    try {
      const next = await fetchWalletNetwork(walletAddress, days, contractAddress);
      setResult(next);
      setNetworkResult(networkResultKey(walletAddress, days), next);
      useAppStore.getState().setLastQueryMs(elapsedMs(start));
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Link scan failed");
    } finally {
      setLoading(false);
    }
  };

  const openLinkedWallet = (address: string, label: string | null) => {
    const contract =
      contractAddress ?? result.contextContract ?? result.commonTokenClusters[0]?.contractAddress;
    if (!contract) return;
    openWalletPanel(address, contract, {
      label: walletName(address, label, walletAliases),
    });
  };

  const tabBtn = (id: ViewTab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`border px-2 py-1 text-[10px] ${
        tab === id
          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
          : "border-[var(--border)] text-[var(--text-secondary)]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3 text-[11px]">
      <div>
        <div className="text-[var(--accent)]">CO-BUY LINKS</div>
        <div className="text-[10px] text-[var(--text-secondary)]">
          Wallets that bought the same tokens as{" "}
          <span className="text-[var(--text-primary)]">
            {walletName(result.seedWallet, null, walletAliases)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border border-[var(--border)] bg-[var(--bg)] p-2 text-center">
        <div>
          <div className="text-lg text-[var(--accent)]">{result.friends.length}</div>
          <div className="text-[9px] text-[var(--text-secondary)]">linked wallets</div>
        </div>
        <div>
          <div className="text-lg text-[var(--danger)]">{sameDayCount}</div>
          <div className="text-[9px] text-[var(--text-secondary)]">same-day buys</div>
        </div>
        <div>
          <div className="text-lg text-[var(--warning)]">{sharedFunderCount}</div>
          <div className="text-[9px] text-[var(--text-secondary)]">shared funder</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void rerun(30)}
          disabled={loading}
          className={`border px-2 py-1 text-[10px] ${
            windowDays === 30
              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
              : "border-[var(--border)] text-[var(--text-secondary)]"
          }`}
        >
          30 DAYS
        </button>
        <button
          type="button"
          onClick={() => void rerun(90)}
          disabled={loading}
          className={`border px-2 py-1 text-[10px] ${
            windowDays === 90
              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
              : "border-[var(--border)] text-[var(--text-secondary)]"
          }`}
        >
          90 DAYS
        </button>
        {loading ? (
          <span className="self-center text-[10px] text-[var(--warning)]">SCANNING...</span>
        ) : null}
      </div>

      <div className="flex gap-2">
        {tabBtn("tokens", "BY TOKEN")}
        {tabBtn("wallets", "BY WALLET")}
        {tabBtn("map", "GRAPH")}
      </div>

      {tab === "tokens" ? (
        <section className="space-y-2">
          {tokenCards.length === 0 ? (
            <p className="text-[var(--text-secondary)]">
              No shared token buys found in this window.
            </p>
          ) : (
            tokenCards.map(({ cluster, linked, seedBoughtAt, sameDay }) => {
              const isContext =
                result.contextContract?.toLowerCase() ===
                cluster.contractAddress.toLowerCase();
              return (
                <div
                  key={cluster.contractAddress}
                  className={`border p-2 ${
                    isContext
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--border)]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[var(--accent)]">{cluster.symbol}</span>
                      {isContext ? (
                        <span className="ml-2 text-[9px] text-[var(--accent)]">
                          · viewing this token
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[9px] text-[var(--text-secondary)]">
                      {linked.length} wallet{linked.length === 1 ? "" : "s"}
                      {sameDay > 0 ? ` · ${sameDay} same-day` : ""}
                    </span>
                  </div>
                  {seedBoughtAt ? (
                    <p className="mt-1 text-[9px] text-[var(--text-secondary)]">
                      You bought {formatBuyDate(seedBoughtAt)}
                    </p>
                  ) : null}
                  <div className="mt-2 space-y-1">
                    {linked.map(({ friend, match }) => (
                      <button
                        key={friend.address}
                        type="button"
                        onClick={() => openLinkedWallet(friend.address, friend.label)}
                        className="flex w-full items-center justify-between gap-2 border-b border-[var(--border)]/30 py-1 text-left hover:bg-[var(--accent)]/10"
                      >
                        <span className="text-[var(--text-primary)]">
                          {walletName(friend.address, friend.label, walletAliases)}
                        </span>
                        <span className="flex items-center gap-2 text-[9px]">
                          <span className="text-[var(--text-secondary)]">
                            {formatBuyDate(match.friendBoughtAt)}
                          </span>
                          <span
                            className={`border px-1 py-0.5 ${timingClass(match.daysApart)}`}
                          >
                            {timingLabel(match.daysApart)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </section>
      ) : null}

      {tab === "wallets" ? (
        <section className="max-h-[340px] space-y-1 overflow-auto os-scrollbar">
          {result.friends.length === 0 ? (
            <p className="text-[var(--text-secondary)]">No linked wallets in this window.</p>
          ) : (
            result.friends.map((friend) => {
              const tier = bondTier(friend.bondScore);
              const badges = friend.relationTypes
                .map((r) => RELATION_LABEL[r] ?? r.replace(/_/g, " "))
                .slice(0, 3);
              const closest = [...friend.commonTokens].sort(
                (a, b) => a.daysApart - b.daysApart
              )[0];

              return (
                <button
                  key={friend.address}
                  type="button"
                  onClick={() => openLinkedWallet(friend.address, friend.label)}
                  className="w-full border-b border-[var(--border)]/40 py-2 text-left hover:bg-[var(--accent)]/10"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-[var(--accent)]">
                      {walletName(friend.address, friend.label, walletAliases)}
                    </span>
                    <span className={`text-[9px] ${tier.className}`}>
                      {tier.label} link · {friend.commonTokens.length} token
                      {friend.commonTokens.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {badges.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {badges.map((badge) => (
                        <span
                          key={badge}
                          className="border border-[var(--border)] px-1 py-0.5 text-[8px] text-[var(--text-secondary)]"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {closest ? (
                    <p className="mt-1 text-[9px] text-[var(--text-secondary)]">
                      Closest overlap: {closest.symbol} · {timingLabel(closest.daysApart)}
                    </p>
                  ) : null}
                </button>
              );
            })
          )}
        </section>
      ) : null}

      {tab === "map" ? (
        <section className="space-y-2">
          <NetworkGraph nodes={result.graph.nodes} edges={result.graph.edges} />
          <div className="grid grid-cols-2 gap-1 text-[9px] text-[var(--text-secondary)]">
            <span>
              <span className="text-[var(--accent)]">━</span> bought same tokens
            </span>
            <span>
              <span className="text-[var(--success)]">━</span> shared token timing
            </span>
            <span>
              <span className="text-[var(--danger)]">━</span> funded by
            </span>
          </div>
        </section>
      ) : null}
    </div>
  );
}

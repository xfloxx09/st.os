"use client";

import type { BulkExposeResult } from "@/lib/analyze/types";
import { truncateAddress } from "@/lib/ethereum";
import { NetworkGraph } from "@/components/terminal/network-graph";

const VERDICT_COLOR: Record<string, string> = {
  WINNING_SYNDICATE: "var(--success)",
  LOSING_BAGHOLDERS: "var(--danger)",
  MIXED: "var(--warning)",
  UNKNOWN: "var(--text-secondary)",
};

export function ExposeReportPanel({ result }: { result: BulkExposeResult }) {
  const primary = result.primaryNetwork;

  return (
    <div className="space-y-3 text-[11px]">
      <div className="flex flex-wrap items-start justify-between gap-3 border border-[var(--danger)]/40 bg-[var(--bg)] p-3">
        <div>
          <div className="text-[var(--danger)]">BULK EXPOSE COMPLETE</div>
          <p className="mt-1 text-[10px] text-[var(--text-primary)]">{result.summary}</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[var(--text-secondary)]">COMBINED SUSPICION</div>
          <div className="text-2xl text-[var(--danger)]">{result.combinedSuspicion}</div>
          <div className="text-[9px] text-[var(--text-secondary)]">
            {result.windowDays}d window · {result.entries.length} wallets mapped
          </div>
        </div>
      </div>

      <div className="max-h-36 overflow-auto os-scrollbar">
        <table className="w-full text-left text-[10px]">
          <thead className="sticky top-0 bg-[var(--bg-panel)] text-[var(--text-secondary)]">
            <tr className="border-b border-[var(--border)]">
              <th className="py-1 pr-2">WALLET</th>
              <th className="py-1 pr-2 text-right">SCORE</th>
              <th className="py-1 pr-2 text-right">NET</th>
              <th className="py-1 text-right">VERDICT</th>
            </tr>
          </thead>
          <tbody>
            {result.entries.map((entry) => (
              <tr
                key={entry.walletAddress}
                className="border-b border-[var(--border)]/40"
              >
                <td className="py-1.5 pr-2">
                  {entry.label ?? truncateAddress(entry.walletAddress, 6)}
                </td>
                <td className="py-1.5 pr-2 text-right text-[var(--warning)]">
                  {entry.exposeScore}
                </td>
                <td className="py-1.5 pr-2 text-right">
                  {entry.network ? (
                    <span className="text-[var(--danger)]">
                      {entry.network.suspicionScore}
                    </span>
                  ) : (
                    <span className="text-[var(--text-secondary)]">—</span>
                  )}
                </td>
                <td className="py-1.5 text-right text-[9px]">
                  {entry.network ? (
                    <span style={{ color: VERDICT_COLOR[entry.network.clusterVerdict] }}>
                      {entry.network.clusterVerdict.replace(/_/g, " ")}
                    </span>
                  ) : (
                    <span className="text-[var(--text-secondary)]">
                      {entry.error ?? "FAILED"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {primary ? (
        <div className="space-y-2 border-t border-[var(--border)] pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[var(--accent)]">STRONGEST LINK CLUSTER</div>
              <div className="text-[10px] text-[var(--text-secondary)]">
                {truncateAddress(primary.seedWallet, 6)} · most linked wallet
              </div>
              <p className="mt-1 text-[10px]">{primary.summary}</p>
            </div>
            <div
              className="text-[9px]"
              style={{ color: VERDICT_COLOR[primary.clusterVerdict] }}
            >
              {primary.clusterVerdict.replace(/_/g, " ")}
            </div>
          </div>
          <NetworkGraph
            nodes={primary.graph.nodes}
            edges={primary.graph.edges}
          />
          {primary.friends.length > 0 ? (
            <div className="max-h-24 overflow-auto os-scrollbar text-[10px]">
              {primary.friends.slice(0, 8).map((friend) => (
                <div
                  key={friend.address}
                  className="border-b border-[var(--border)]/30 py-1"
                >
                  <span className="text-[var(--text-primary)]">
                    {friend.label ?? truncateAddress(friend.address, 6)}
                  </span>
                  <span className="ml-2 text-[var(--text-secondary)]">
                    bond {friend.bondScore} · {friend.relationTypes.join(", ")}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-[var(--text-secondary)]">
          No network graphs generated. Try again or expose individual wallets.
        </p>
      )}
    </div>
  );
}

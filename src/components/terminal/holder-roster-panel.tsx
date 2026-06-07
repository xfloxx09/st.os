"use client";

import type { HolderEntry } from "@/lib/analyze/types";
import { formatUsd, truncateAddress } from "@/lib/ethereum";

export function HolderRosterPanel({
  holders,
  allHolders,
}: {
  holders: HolderEntry[];
  allHolders: HolderEntry[];
}) {
  const excludedCount = allHolders.length - holders.length;

  return (
    <div className="space-y-3 text-[11px]">
      <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
        <span>
          {holders.length} ANALYZABLE HOLDERS
          {excludedCount > 0 ? ` · ${excludedCount} filtered (CEX/DEX/burn)` : ""}
        </span>
        <span className="text-[var(--accent)]">STALK → Phase 2</span>
      </div>

      <div className="max-h-[300px] overflow-auto os-scrollbar">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-[var(--bg-panel)] text-[10px] text-[var(--text-secondary)]">
            <tr className="border-b border-[var(--border)]">
              <th className="py-1 pr-2">#</th>
              <th className="py-1 pr-2">WALLET</th>
              <th className="py-1 pr-2 text-right">%</th>
              <th className="py-1 pr-2 text-right">USD</th>
              <th className="py-1 text-right">ACT</th>
            </tr>
          </thead>
          <tbody>
            {holders.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[var(--text-secondary)]">
                  No analyzable holders found. All top addresses are pools/CEX.
                </td>
              </tr>
            ) : (
              holders.map((holder) => (
                <tr
                  key={holder.address}
                  className="border-b border-[var(--border)]/50 hover:bg-[var(--bg)]"
                >
                  <td className="py-1.5 pr-2 text-[var(--text-secondary)]">
                    {holder.rank}
                  </td>
                  <td className="py-1.5 pr-2">
                    <div className="text-[var(--text-primary)]">
                      {holder.label ?? truncateAddress(holder.address)}
                    </div>
                    {holder.label ? (
                      <div className="text-[10px] text-[var(--text-secondary)]">
                        {truncateAddress(holder.address)}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-1.5 pr-2 text-right">
                    {holder.percentOfSupply.toFixed(2)}%
                  </td>
                  <td className="py-1.5 pr-2 text-right">
                    {formatUsd(holder.usdValue)}
                  </td>
                  <td className="py-1.5 text-right">
                    <button
                      type="button"
                      disabled
                      title="Wallet deep dive ships in Phase 2"
                      className="border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]"
                    >
                      STALK
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {excludedCount > 0 ? (
        <details className="text-[10px] text-[var(--text-secondary)]">
          <summary className="cursor-pointer text-[var(--warning)]">
            Show {excludedCount} filtered addresses
          </summary>
          <ul className="mt-2 space-y-1">
            {allHolders
              .filter((h) => h.excluded)
              .map((h) => (
                <li key={h.address}>
                  {h.label ?? truncateAddress(h.address)} — {h.percentOfSupply.toFixed(2)}%
                </li>
              ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

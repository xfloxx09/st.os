"use client";

import type { CrossAnalysisResult } from "@/lib/analyze/types";
import { truncateAddress } from "@/lib/ethereum";

export function CrossAnalysisPanel({ result }: { result: CrossAnalysisResult }) {
  return (
    <div className="space-y-4 text-[11px]">
      <div>
        <div className="text-[var(--accent)]">CROSS-HOLDER ENGINE</div>
        <div className="text-[10px] text-[var(--text-secondary)]">
          {result.contracts.length} tokens · {result.totalOverlappingWallets} overlapping wallets
        </div>
        {result.cached ? (
          <p className="text-[10px] text-[var(--text-secondary)]">[CACHED RESPONSE]</p>
        ) : null}
      </div>

      <section>
        <h3 className="mb-2 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          TOKENS COMPARED
        </h3>
        <div className="flex flex-wrap gap-2">
          {result.contracts.map((ca) => (
            <span
              key={ca}
              className="border border-[var(--border)] px-2 py-0.5 text-[10px]"
            >
              {result.tokenSymbols[ca] ?? truncateAddress(ca)}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          TOP INSIDER CANDIDATES
        </h3>
        <div className="max-h-36 space-y-1 overflow-auto os-scrollbar">
          {result.topInsiderCandidates.length === 0 ? (
            <p className="text-[var(--text-secondary)]">No overlapping holders found.</p>
          ) : (
            result.topInsiderCandidates.map((row) => (
              <div
                key={row.address}
                className="flex items-center justify-between gap-2 border-b border-[var(--border)]/40 py-1"
              >
                <span>{row.label ?? truncateAddress(row.address)}</span>
                <span className="text-[var(--warning)]">SCORE {row.insiderScore}</span>
                <span className="text-[var(--text-secondary)]">
                  {row.tokens.length} tokens
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          SHARED HOLDERS
        </h3>
        <div className="max-h-40 overflow-auto os-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[var(--bg-panel)] text-[10px] text-[var(--text-secondary)]">
              <tr>
                <th className="py-1 pr-2">WALLET</th>
                <th className="py-1 pr-2">TOKENS</th>
                <th className="py-1 text-right">SCORE</th>
              </tr>
            </thead>
            <tbody>
              {result.overlaps.map((row) => (
                <tr key={row.address} className="border-b border-[var(--border)]/40">
                  <td className="py-1 pr-2">{row.label ?? truncateAddress(row.address)}</td>
                  <td className="py-1 pr-2 text-[var(--text-secondary)]">
                    {row.tokens
                      .map((t) => `${t.symbol ?? "?"} ${t.percentOfSupply.toFixed(1)}%`)
                      .join(" · ")}
                  </td>
                  <td className="py-1 text-right text-[var(--accent)]">{row.insiderScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          SHARED FUND SOURCES
        </h3>
        <div className="max-h-32 space-y-2 overflow-auto os-scrollbar">
          {result.sharedFundSources.length === 0 ? (
            <p className="text-[var(--text-secondary)]">No shared funding paths detected.</p>
          ) : (
            result.sharedFundSources.map((source) => (
              <div
                key={source.sourceAddress}
                className="border border-[var(--border)] p-2"
              >
                <div className="flex justify-between gap-2">
                  <span>{source.label ?? truncateAddress(source.sourceAddress)}</span>
                  <span className="text-[var(--danger)]">
                    SUSPICION {source.suspicionScore}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)]">
                  Funds {source.holderAddresses.length} holders · ranks{" "}
                  {source.holderRanks.join(", ")}
                </p>
                {source.flags.map((flag) => (
                  <p key={flag} className="text-[10px] text-[var(--danger)]">
                    ⚠ {flag}
                  </p>
                ))}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

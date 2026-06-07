"use client";

import type { FundTraceResult } from "@/lib/analyze/types";
import { truncateAddress } from "@/lib/ethereum";

export function FundTracerPanel({ result }: { result: FundTraceResult }) {
  return (
    <div className="space-y-4 text-[11px]">
      <div>
        <div className="text-[var(--accent)]">
          FUND TRACER · {result.tokenSymbol ?? truncateAddress(result.contractAddress)}
        </div>
        <div className="text-[10px] text-[var(--text-secondary)]">
          {result.entries.length} holders traced · cluster score{" "}
          <span className="text-[var(--warning)]">{result.insiderClusterScore}</span>
        </div>
        {result.cached ? (
          <p className="text-[10px] text-[var(--text-secondary)]">[CACHED RESPONSE]</p>
        ) : null}
      </div>

      <section>
        <h3 className="mb-2 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          SHARED FUND SOURCES
        </h3>
        <div className="max-h-36 space-y-2 overflow-auto os-scrollbar">
          {result.sharedSources.length === 0 ? (
            <p className="text-[var(--text-secondary)]">
              No shared fund origins among top holders.
            </p>
          ) : (
            result.sharedSources.map((source) => (
              <div
                key={source.sourceAddress}
                className="border border-[var(--warning)]/50 bg-[var(--bg)] p-2"
              >
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--text-primary)]">
                    {source.label ?? truncateAddress(source.sourceAddress)}
                  </span>
                  <span className="text-[var(--warning)]">{source.suspicionScore}</span>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)]">
                  Linked holders:{" "}
                  {source.holderAddresses.map((a) => truncateAddress(a)).join(", ")}
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

      <section>
        <h3 className="mb-2 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
          HOLDER FUND MAP
        </h3>
        <div className="max-h-52 overflow-auto os-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[var(--bg-panel)] text-[10px] text-[var(--text-secondary)]">
              <tr>
                <th className="py-1 pr-2">#</th>
                <th className="py-1 pr-2">HOLDER</th>
                <th className="py-1 pr-2">ORIGIN</th>
                <th className="py-1 text-right">HOPS</th>
              </tr>
            </thead>
            <tbody>
              {result.entries.map((entry) => (
                <tr key={entry.holderAddress} className="border-b border-[var(--border)]/40">
                  <td className="py-1 pr-2 text-[var(--text-secondary)]">
                    {entry.holderRank}
                  </td>
                  <td className="py-1 pr-2">
                    {entry.holderLabel ?? truncateAddress(entry.holderAddress)}
                  </td>
                  <td className="py-1 pr-2 text-[var(--text-secondary)]">
                    {entry.fundOrigin.source}
                    {entry.fundOrigin.flags.length > 0 ? " ⚠" : ""}
                  </td>
                  <td className="py-1 text-right">{entry.fundOrigin.hops}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

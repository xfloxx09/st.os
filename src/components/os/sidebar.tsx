"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import type { CaAnalysisResult } from "@/lib/analyze/types";
import type { SearchHistoryItem } from "@/stores/app-store";
import { isValidEthAddress } from "@/lib/ethereum";

export function Sidebar() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const searchHistory = useAppStore((s) => s.searchHistory);
  const setSearchHistory = useAppStore((s) => s.setSearchHistory);
  const setAnalysis = useAppStore((s) => s.setAnalysis);
  const openAnalysisPanels = useAppStore((s) => s.openAnalysisPanels);
  const setLastQueryMs = useAppStore((s) => s.setLastQueryMs);
  const setAnalyzeError = useAppStore((s) => s.setAnalyzeError);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const loadSearch = async (item: SearchHistoryItem) => {
    if (!isValidEthAddress(item.contractAddress)) return;

    setLoadingId(item.id);
    setAnalyzeError(null);
    const start = Date.now();

    try {
      const res = await fetch(
        `/api/analyze/ca?address=${encodeURIComponent(item.contractAddress)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");

      const result = data as CaAnalysisResult & {
        searchHistory: SearchHistoryItem[];
      };

      setAnalysis(result.contractAddress, result);
      openAnalysisPanels(result.contractAddress);
      setSearchHistory(result.searchHistory);
      setLastQueryMs(Date.now() - start);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoadingId(null);
    }
  };

  if (!sidebarOpen) return null;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-panel)]">
      <div className="border-b border-[var(--border)] px-3 py-2 text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
        RECENT SEARCHES
      </div>
      <div className="os-scrollbar flex-1 overflow-y-auto p-2">
        {searchHistory.length === 0 ? (
          <p className="px-2 py-4 text-[11px] leading-relaxed text-[var(--text-secondary)]">
            No searches yet. Paste a contract address to begin forensics.
          </p>
        ) : (
          <ul className="space-y-1">
            {searchHistory.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void loadSearch(item)}
                  disabled={loadingId === item.id}
                  className="flex w-full items-center gap-2 border border-transparent px-2 py-1.5 text-left text-[11px] hover:border-[var(--border)] hover:bg-[var(--bg)] disabled:opacity-50"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span className="truncate text-[var(--text-primary)]">
                    {loadingId === item.id
                      ? "LOADING..."
                      : (item.tokenSymbol ?? item.contractAddress.slice(0, 10))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

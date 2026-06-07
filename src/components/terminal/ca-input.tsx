"use client";

import { useRef, useState, type FormEvent } from "react";
import { useAppStore } from "@/stores/app-store";
import type { CaAnalysisResult } from "@/lib/analyze/types";
import type { SearchHistoryItem } from "@/stores/app-store";
import { isValidEthAddress } from "@/lib/ethereum";

export function CaInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const setActiveProcesses = useAppStore((s) => s.setActiveProcesses);
  const activeProcesses = useAppStore((s) => s.activeProcesses);
  const setAnalysis = useAppStore((s) => s.setAnalysis);
  const openAnalysisPanels = useAppStore((s) => s.openAnalysisPanels);
  const setSearchHistory = useAppStore((s) => s.setSearchHistory);
  const setLastQueryMs = useAppStore((s) => s.setLastQueryMs);
  const setAnalyzeError = useAppStore((s) => s.setAnalyzeError);

  const submit = async (address: string) => {
    const trimmed = address.trim();
    if (!isValidEthAddress(trimmed)) {
      setAnalyzeError("Invalid contract address. Must be 0x + 40 hex chars.");
      return;
    }

    setAnalyzeError(null);
    setLoading(true);
    setActiveProcesses(activeProcesses + 1);
    const start = Date.now();

    try {
      const res = await fetch(
        `/api/analyze/ca?address=${encodeURIComponent(trimmed)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Analysis failed");
      }

      const result = data as CaAnalysisResult & {
        searchHistory: SearchHistoryItem[];
      };

      setAnalysis(result.contractAddress, result);
      openAnalysisPanels(result.contractAddress);
      setSearchHistory(result.searchHistory);
      setLastQueryMs(Date.now() - start);
      setValue("");
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analysis failed");
      setLastQueryMs(null);
    } finally {
      setLoading(false);
      setActiveProcesses(Math.max(0, useAppStore.getState().activeProcesses - 1));
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!loading) void submit(value);
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
      <label className="block text-[10px] tracking-[0.2em] text-[var(--text-secondary)]">
        CONTRACT ADDRESS INPUT
      </label>
      <div className="mt-1 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0x... paste token contract address"
          disabled={loading}
          className="flex-1 border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="border border-[var(--accent)] px-4 py-2 text-xs tracking-wider text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)] disabled:opacity-40"
        >
          {loading ? "SCANNING..." : "ANALYZE"}
        </button>
      </div>
      <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
        Ctrl+K to focus · Enter to analyze
      </p>
    </form>
  );
}

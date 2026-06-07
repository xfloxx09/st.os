"use client";

import { useAppStore } from "@/stores/app-store";

export function StatusBar() {
  const lastQueryMs = useAppStore((s) => s.lastQueryMs);
  const currentContract = useAppStore((s) => s.currentContract);

  const queryLabel =
    lastQueryMs != null ? `${(lastQueryMs / 1000).toFixed(1)}s` : "--";

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-[var(--border)] bg-[var(--bg-panel)] px-3 text-[10px] text-[var(--text-secondary)]">
      <span>
        CONNECTED | ETH MAINNET
        {currentContract ? ` | CA ${currentContract.slice(0, 10)}...` : ""}
      </span>
      <span>LAST QUERY: {queryLabel}</span>
    </footer>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/stores/app-store";

export function StatusBar() {
  const lastQueryMs = useAppStore((s) => s.lastQueryMs);
  const currentContract = useAppStore((s) => s.currentContract);
  const trackedWallets = useAppStore((s) => s.trackedWallets);
  const user = useAppStore((s) => s.user);

  const gasQuery = useQuery({
    queryKey: ["gas"],
    queryFn: async () => {
      const res = await fetch("/api/network/gas");
      if (!res.ok) return { gwei: 0 };
      return res.json() as Promise<{ gwei: number }>;
    },
    refetchInterval: 60_000,
  });

  const queryLabel =
    lastQueryMs != null ? `${(lastQueryMs / 1000).toFixed(1)}s` : "--";
  const gasLabel =
    gasQuery.data?.gwei && gasQuery.data.gwei > 0
      ? `${gasQuery.data.gwei.toFixed(1)} gwei`
      : "-- gwei";

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-[var(--border)] bg-[var(--bg-panel)] px-3 text-[10px] text-[var(--text-secondary)]">
      <span>
        CONNECTED | ETH MAINNET | GAS {gasLabel}
        {currentContract ? ` | CA ${currentContract.slice(0, 10)}...` : ""}
        {user && trackedWallets.length > 0
          ? ` | ${trackedWallets.length} TRACKED`
          : ""}
      </span>
      <span>LAST QUERY: {queryLabel}</span>
    </footer>
  );
}

"use client";

import { useAppStore } from "@/stores/app-store";

export function Sidebar() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const searchHistory = useAppStore((s) => s.searchHistory);

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
                  className="flex w-full items-center gap-2 border border-transparent px-2 py-1.5 text-left text-[11px] hover:border-[var(--border)] hover:bg-[var(--bg)]"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-secondary)]" />
                  <span className="truncate text-[var(--text-primary)]">
                    {item.tokenSymbol ?? item.contractAddress.slice(0, 10)}
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

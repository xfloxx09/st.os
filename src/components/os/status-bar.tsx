"use client";

export function StatusBar() {
  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-[var(--border)] bg-[var(--bg-panel)] px-3 text-[10px] text-[var(--text-secondary)]">
      <span>CONNECTED | ETH MAINNET | BLOCK #--</span>
      <span>LAST QUERY: --</span>
    </footer>
  );
}

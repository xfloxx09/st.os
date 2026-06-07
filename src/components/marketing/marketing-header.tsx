import Link from "next/link";

export function MarketingHeader() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--bg-panel)] px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="tracking-[0.3em] text-[var(--accent)]">
          EXPOSED.OS
        </Link>
        <nav className="flex items-center gap-6 text-xs text-[var(--text-secondary)]">
          <Link href="/pricing" className="hover:text-[var(--accent)]">
            Pricing
          </Link>
          <Link
            href="/app"
            className="border border-[var(--accent)] px-3 py-1.5 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]"
          >
            Launch Terminal
          </Link>
        </nav>
      </div>
    </header>
  );
}

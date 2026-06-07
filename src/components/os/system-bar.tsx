"use client";

import { TelegramLogin } from "@/components/auth/telegram-login";
import { useAppStore } from "@/stores/app-store";

export function SystemBar() {
  const user = useAppStore((s) => s.user);
  const guest = useAppStore((s) => s.guest);
  const activeProcesses = useAppStore((s) => s.activeProcesses);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const botUsername = useAppStore((s) => s.telegramBotUsername);

  const displayName = user
    ? user.username
      ? `@${user.username}`
      : user.firstName ?? "OPERATOR"
    : guest
      ? `GUEST (${guest.searchesRemaining}/${guest.searchesLimit})`
      : "GUEST";

  return (
    <header className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-panel)] px-3 text-xs">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggleSidebar}
          className="text-[var(--text-secondary)] hover:text-[var(--accent)]"
          aria-label="Toggle sidebar"
        >
          [::]
        </button>
        <span className="tracking-[0.25em] text-[var(--accent)]">STALKER.OS</span>
      </div>

      <div className="flex items-center gap-6 text-[var(--text-secondary)]">
        <span>GAS: -- gwei</span>
        <span>
          PROC:{" "}
          <span className="text-[var(--text-primary)]">{activeProcesses}</span>
        </span>
        <span className="text-[var(--text-primary)]">{displayName}</span>
        {!user && !guest && botUsername ? (
          <TelegramLogin botUsername={botUsername} />
        ) : null}
      </div>
    </header>
  );
}
